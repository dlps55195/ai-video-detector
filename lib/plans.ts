// Client-safe plan config — no Stripe SDK import here
export const PLANS = {
  plus: {
    name: 'Plus',
    price: 5,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID ?? '',
    detectionsPerMonth: 50,
    detectionsPerDay: 5,
    features: [
      '50 video detections / month',
      'Hive AI — 95%+ accuracy',
      'Frame-by-frame breakdown',
      'Analysis history',
      '5 detections / day',
    ],
  },
  pro: {
    name: 'Pro',
    price: 15,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? '',
    detectionsPerMonth: 150,
    detectionsPerDay: 15,
    features: [
      '150 video detections / month',
      'Hive AI — 95%+ accuracy',
      'Frame-by-frame breakdown',
      'Full analysis history',
      'Priority processing',
      '15 detections / day',
    ],
  },
  unlimited: {
    name: 'Unlimited',
    price: 49,
    priceId: process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID ?? '',
    detectionsPerMonth: 1000,
    detectionsPerDay: 50,
    features: [
      '1,000 video detections / month',
      'Hive AI — 95%+ accuracy',
      'Frame-by-frame breakdown',
      'Full analysis history',
      'Priority processing',
      'API access',
      'Priority support',
      '50 detections / day',
    ],
  },
} as const;
