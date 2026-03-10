// Client-safe plan config — no Stripe SDK import here
export const PLANS = {
  pro: {
    name: 'Pro',
    price: 9,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? '',
    features: [
      '50 video analyses / month',
      'Frame-by-frame breakdown',
      'History dashboard',
      'Priority processing',
    ],
  },
  unlimited: {
    name: 'Unlimited',
    price: 29,
    priceId: process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID ?? '',
    features: [
      'Unlimited video analyses',
      'Frame-by-frame breakdown',
      'History dashboard',
      'Batch upload',
      'API access',
      'Priority support',
    ],
  },
} as const;