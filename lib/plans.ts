// Client-safe plan config — no Stripe SDK import here

export type PlanKey = 'free' | 'plus' | 'pro' | 'unlimited';

export const PLAN_QUOTAS: Record<PlanKey, { monthly: number; daily: number }> = {
  free:      { monthly: 3,    daily: 9999 },
  plus:      { monthly: 50,   daily: 9999 },
  pro:       { monthly: 150,  daily: 9999 },
  unlimited: { monthly: 1000, daily: 9999 },
};

// Features available per plan (used for UI gating)
export const PLAN_FEATURES: Record<PlanKey, {
  frameByFrame: boolean;
  analysisHistory: boolean;
  fullHistory: boolean;
  priorityProcessing: boolean;
  apiAccess: boolean;
}> = {
  free:      { frameByFrame: false, analysisHistory: false, fullHistory: false, priorityProcessing: false, apiAccess: false },
  plus:      { frameByFrame: true,  analysisHistory: true,  fullHistory: false, priorityProcessing: false, apiAccess: false },
  pro:       { frameByFrame: true,  analysisHistory: true,  fullHistory: true,  priorityProcessing: true,  apiAccess: false },
  unlimited: { frameByFrame: true,  analysisHistory: true,  fullHistory: true,  priorityProcessing: true,  apiAccess: true  },
};

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
