export type PlanId = 'monthly' | 'annual';

export interface PackageInfo {
  id: PlanId;
  productIdentifier: string;
  packageType: 'monthly' | 'annual';
  priceString: string;
  savingsLabel?: string;
}

export interface Offerings {
  monthly: PackageInfo;
  annual: PackageInfo;
}

export interface PurchaseResult {
  success: boolean;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  found: boolean;
}
