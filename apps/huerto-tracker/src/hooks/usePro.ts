import { usePurchases } from '@portfolio/billing';

// Gated behind __DEV__ so release builds never honor the flag even if the env var leaks.
const DEV_PRO = __DEV__ && process.env.EXPO_PUBLIC_DEV_PRO === 'true';

export function usePro() {
  const purchases = usePurchases();
  if (DEV_PRO) return { ...purchases, isPro: true };
  return purchases;
}
