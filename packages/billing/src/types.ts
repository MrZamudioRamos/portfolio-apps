export type PlanId = 'monthly' | 'annual' | 'lifetime';

export interface PackageInfo {
  id: PlanId;
  productIdentifier: string;
  packageType: 'monthly' | 'annual' | 'lifetime';
  priceString: string;
  savingsLabel?: string;
  isOneTime?: boolean;
}

export interface Offerings {
  monthly: PackageInfo;
  annual: PackageInfo;
  lifetime: PackageInfo;
}

export interface PurchaseResult {
  success: boolean;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  found: boolean;
}
