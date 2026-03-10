'use client';

import { useState } from 'react';
import AuthNav from '@/components/AuthNav';
import CheckoutModal from '@/components/CheckoutModal';
import { PLANS } from '@/lib/plans';

export default function PricingPage() {
  const [selected, setSelected] = useState<{
    planName: string;
    price: number;
    priceId: string;
  } | null>(null);

  const plans = [
    {
      key: 'pro',
      ...PLANS.pro,
      tagline: 'For creators and researchers',
      highlight: false,
    },
    {
      key: 'unlimited',
      ...PLANS.unlimited,
      tagline: 'For power users and teams',
      highlight: true,
    },
  ];

  return (
    <div className="min-h-screen bg-void">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid opacity-100" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-amber-glow opacity-[0.02] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        <AuthNav />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-24">
          {/* Header */}
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-glow animate-pulse" />
              <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">Pricing</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-black text-slate-100 mb-4">
              Know what's real.
            </h1>
            <p className="text-slate-400 text-base max-w-md mx-auto">
              Frame-by-frame forensic AI detection. No guessing.
            </p>
          </div>

          {/* Plan cards */}
          <div className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.key}
                className={`relative border rounded-2xl p-6 flex flex-col transition-all duration-200 hover:scale-[1.01] ${
                  plan.highlight
                    ? 'border-amber-glow/50 bg-amber-glow/5 glow-amber'
                    : 'border-border bg-surface hover:border-slate-600'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-amber-glow text-void font-mono text-[10px] uppercase tracking-widest rounded-full font-bold">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                    {plan.tagline}
                  </div>
                  <h2 className="font-display text-xl font-black text-slate-100 mb-3">
                    VeriFrame {plan.name}
                  </h2>
                  <div className="flex items-end gap-1">
                    <span className={`font-display text-4xl font-black ${plan.highlight ? 'text-amber-glow' : 'text-slate-100'}`}>
                      ${plan.price}
                    </span>
                    <span className="font-mono text-xs text-slate-500 mb-1.5">/month</span>
                  </div>
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <span className={`mt-0.5 text-sm shrink-0 ${plan.highlight ? 'text-amber-glow' : 'text-signal-real'}`}>
                        ✓
                      </span>
                      <span className="font-mono text-xs text-slate-300">{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setSelected({ planName: plan.name, price: plan.price, priceId: plan.priceId })}
                  className={`w-full py-3.5 font-display font-bold rounded-xl transition-all duration-200 ${
                    plan.highlight
                      ? 'bg-amber-glow text-void hover:bg-amber-400 glow-amber'
                      : 'border border-border text-slate-300 hover:border-amber-glow hover:text-amber-glow bg-transparent'
                  }`}
                >
                  Get {plan.name} →
                </button>
              </div>
            ))}
          </div>

          {/* Trust line */}
          <p className="text-center font-mono text-[10px] text-slate-600 mt-10">
            Secured by Stripe · Cancel anytime · No contracts
          </p>
        </main>
      </div>

      {/* Checkout modal */}
      {selected && (
        <CheckoutModal
          planName={selected.planName}
          price={selected.price}
          priceId={selected.priceId}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
