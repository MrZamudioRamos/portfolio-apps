import { usePurchases } from '@portfolio/billing';

const DEV_PRO = process.env.EXPO_PUBLIC_DEV_PRO === 'true';

export function usePro() {
  const purchases = usePurchases();
  if (DEV_PRO) return { ...purchases, isPro: true };
  return purchases;
}
