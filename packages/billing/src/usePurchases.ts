import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import type { Offerings, PlanId, PurchaseResult, RestoreResult } from './types';

const PRO_KEY = '@portfolio/billing/pro';
const PLAN_KEY = '@portfolio/billing/plan';

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

export function usePurchases() {
  const [isPro, setIsPro] = useState(false);
  const [activePlan, setActivePlan] = useState<PlanId | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet([PRO_KEY, PLAN_KEY])
      .then(([[, status], [, plan]]) => {
        setIsPro(status === 'true');
        const validPlan: PlanId | null = plan === 'monthly' || plan === 'annual' ? plan : null;
        setActivePlan(validPlan);
      })
      .finally(() => setLoading(false));
  }, []);

  async function purchase(planId: PlanId): Promise<PurchaseResult> {
    setPurchasing(true);
    try {
      await new Promise<void>((r) => setTimeout(r, 1100));
      await AsyncStorage.multiSet([[PRO_KEY, 'true'], [PLAN_KEY, planId]]);
      setIsPro(true);
      setActivePlan(planId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message ?? 'Error desconocido' };
    } finally {
      setPurchasing(false);
    }
  }

  async function restore(): Promise<RestoreResult> {
    setPurchasing(true);
    try {
      await new Promise<void>((r) => setTimeout(r, 800));
      const [[, status], [, plan]] = await AsyncStorage.multiGet([PRO_KEY, PLAN_KEY]);
      const found = status === 'true';
      if (found) {
        setIsPro(true);
        const validPlan: PlanId | null = plan === 'monthly' || plan === 'annual' ? plan : 'annual';
        setActivePlan(validPlan);
      }
      return { success: true, found };
    } catch {
      return { success: false, found: false };
    } finally {
      setPurchasing(false);
    }
  }

  async function cancelSubscription(): Promise<void> {
    await AsyncStorage.multiRemove([PRO_KEY, PLAN_KEY]);
    setIsPro(false);
    setActivePlan(null);
  }

  return {
    isPro,
    activePlan,
    loading,
    purchasing,
    offerings: OFFERINGS,
    purchase,
    restore,
    cancelSubscription,
  };
}
