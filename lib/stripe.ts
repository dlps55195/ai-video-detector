import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
  typescript: true,
});

// Client-side Stripe promise (singleton)
let stripePromise: ReturnType<typeof loadStripe>;
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

export const PLANS = {
  pro: {
    name: 'Pro',
    price: 9,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
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
    priceId: process.env.STRIPE_UNLIMITED_PRICE_ID!,
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