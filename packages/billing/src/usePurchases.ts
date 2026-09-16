import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import type { Offerings, PlanId, PurchaseResult, RestoreResult } from './types';

declare const process: { env: Record<string, string | undefined> };
declare const require: (moduleName: string) => unknown;
declare const __DEV__: boolean;

const PRO_KEY = '@portfolio/billing/pro';
const PLAN_KEY = '@portfolio/billing/plan';
const ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? 'pro';
const MOCK_BILLING = __DEV__ && process.env.EXPO_PUBLIC_BILLING_MOCK === 'true';

export const OFFERINGS: Offerings = {
  monthly: {
    id: 'monthly',
    productIdentifier: 'app.huertotracker.pro.monthly',
    packageType: 'monthly',
    priceString: '2,99 €/mes',
  },
  annual: {
    id: 'annual',
    productIdentifier: 'app.huertotracker.pro.annual',
    packageType: 'annual',
    priceString: '19,99 €/año',
    savingsLabel: 'Ahorra un 44%',
  },
};

type RevenueCatPackage = {
  identifier?: string;
  packageType?: string;
  product?: { identifier?: string; priceString?: string };
};

type RevenueCatCustomerInfo = {
  entitlements?: { active?: Record<string, unknown> };
};

type RevenueCatModule = {
  configure: (options: { apiKey: string }) => void;
  getOfferings: () => Promise<{ current?: { monthly?: RevenueCatPackage; annual?: RevenueCatPackage } | null }>;
  getCustomerInfo: () => Promise<RevenueCatCustomerInfo>;
  addCustomerInfoUpdateListener?: (listener: (info: RevenueCatCustomerInfo) => void) => void;
  removeCustomerInfoUpdateListener?: (listener: (info: RevenueCatCustomerInfo) => void) => boolean;
  purchasePackage: (pkg: RevenueCatPackage) => Promise<{ customerInfo: RevenueCatCustomerInfo }>;
  restorePurchases: () => Promise<RevenueCatCustomerInfo>;
};

function apiKeyForPlatform(): string | undefined {
  if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  return undefined;
}

function loadRevenueCat(): RevenueCatModule | null {
  if (Platform.OS === 'web') return null;
  try {
    const module = require('react-native-purchases') as unknown;
    if (typeof module === 'object' && module !== null && 'default' in module) {
      return (module as { default?: RevenueCatModule }).default ?? null;
    }
    return module as RevenueCatModule;
  } catch {
    // Expo Go and web do not include the native purchases module.
    return null;
  }
}

function hasProEntitlement(info: RevenueCatCustomerInfo | null): boolean {
  return Boolean(info?.entitlements?.active?.[ENTITLEMENT_ID]);
}

function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error && 'userCancelled' in error && error.userCancelled) {
    return 'PURCHASE_CANCELLED';
  }
  return 'PURCHASE_FAILED';
}

function mapPackage(plan: PlanId, pkg: RevenueCatPackage | undefined) {
  if (!pkg) return null;
  return {
    ...OFFERINGS[plan],
    productIdentifier: pkg.product?.identifier ?? OFFERINGS[plan].productIdentifier,
    priceString: pkg.product?.priceString ?? OFFERINGS[plan].priceString,
  };
}

/**
 * RevenueCat is the source of truth in native builds. A local mock is only
 * available when explicitly enabled in a non-production environment, so a
 * missing public store key can never grant Pro to a beta user by accident.
 */
export function usePurchases() {
  const [isPro, setIsPro] = useState(false);
  const [activePlan, setActivePlan] = useState<PlanId | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [isBillingAvailable, setIsBillingAvailable] = useState(MOCK_BILLING);
  const [offerings, setOfferings] = useState<Offerings>(OFFERINGS);
  const rcRef = useRef<RevenueCatModule | null>(null);
  const packagesRef = useRef<Record<PlanId, RevenueCatPackage | undefined>>({ monthly: undefined, annual: undefined });

  useEffect(() => {
    let disposed = false;
    let removeListener: (() => boolean | void) | undefined;

    async function boot() {
      if (MOCK_BILLING) {
        try {
          const [[, status], [, plan]] = await AsyncStorage.multiGet([PRO_KEY, PLAN_KEY]);
          if (!disposed) {
            setIsPro(status === 'true');
            setActivePlan(plan === 'monthly' || plan === 'annual' ? plan : null);
          }
        } finally {
          if (!disposed) setLoading(false);
        }
        return;
      }

      const apiKey = apiKeyForPlatform();
      const rc = apiKey ? loadRevenueCat() : null;
      if (!rc || !apiKey) {
        if (!disposed) {
          setIsBillingAvailable(false);
          setLoading(false);
        }
        return;
      }

      try {
        rc.configure({ apiKey });
        rcRef.current = rc;
        const onCustomerInfo = (info: RevenueCatCustomerInfo) => {
          if (!disposed) setIsPro(hasProEntitlement(info));
        };
        rc.addCustomerInfoUpdateListener?.(onCustomerInfo);
        removeListener = () => rc.removeCustomerInfoUpdateListener?.(onCustomerInfo);

        const [availableOfferings, customerInfo] = await Promise.all([
          rc.getOfferings(),
          rc.getCustomerInfo(),
        ]);
        const monthly = availableOfferings.current?.monthly;
        const annual = availableOfferings.current?.annual;
        packagesRef.current = { monthly, annual };
        if (!disposed) {
          setOfferings({
            monthly: mapPackage('monthly', monthly) ?? OFFERINGS.monthly,
            annual: mapPackage('annual', annual) ?? OFFERINGS.annual,
          });
          setIsPro(hasProEntitlement(customerInfo));
          setIsBillingAvailable(Boolean(monthly || annual));
          setLoading(false);
        }
      } catch {
        if (!disposed) {
          setIsBillingAvailable(false);
          setLoading(false);
        }
      }
    }

    boot().catch(() => {
      if (!disposed) {
        setIsBillingAvailable(false);
        setLoading(false);
      }
    });
    return () => {
      disposed = true;
      removeListener?.();
    };
  }, []);

  async function purchase(planId: PlanId): Promise<PurchaseResult> {
    if (!isBillingAvailable) return { success: false, error: 'BILLING_UNAVAILABLE' };
    setPurchasing(true);
    try {
      if (MOCK_BILLING) {
        await new Promise<void>((resolve) => setTimeout(resolve, 400));
        await AsyncStorage.multiSet([[PRO_KEY, 'true'], [PLAN_KEY, planId]]);
        setIsPro(true);
        setActivePlan(planId);
        return { success: true };
      }

      const pkg = packagesRef.current[planId];
      if (!pkg || !rcRef.current) return { success: false, error: 'BILLING_NOT_READY' };
      const result = await rcRef.current.purchasePackage(pkg);
      setIsPro(hasProEntitlement(result.customerInfo));
      setActivePlan(planId);
      return { success: true };
    } catch (error) {
      return { success: false, error: errorMessage(error) };
    } finally {
      setPurchasing(false);
    }
  }

  async function restore(): Promise<RestoreResult> {
    if (!isBillingAvailable) return { success: false, found: false };
    setPurchasing(true);
    try {
      if (MOCK_BILLING) {
        const [[, status], [, plan]] = await AsyncStorage.multiGet([PRO_KEY, PLAN_KEY]);
        const found = status === 'true';
        if (found) {
          setIsPro(true);
          setActivePlan(plan === 'monthly' || plan === 'annual' ? plan : 'annual');
        }
        return { success: true, found };
      }

      if (!rcRef.current) return { success: false, found: false };
      const info = await rcRef.current.restorePurchases();
      const found = hasProEntitlement(info);
      setIsPro(found);
      return { success: true, found };
    } catch {
      return { success: false, found: false };
    } finally {
      setPurchasing(false);
    }
  }

  async function cancelSubscription(): Promise<void> {
    // Store subscriptions are cancelled in App Store / Google Play. Keep this
    // legacy method for callers, but never fake a cancellation locally.
    if (MOCK_BILLING) {
      await AsyncStorage.multiRemove([PRO_KEY, PLAN_KEY]);
      setIsPro(false);
      setActivePlan(null);
    }
  }

  return {
    isPro,
    activePlan,
    loading,
    purchasing,
    isBillingAvailable,
    offerings,
    purchase,
    restore,
    cancelSubscription,
  };
}
