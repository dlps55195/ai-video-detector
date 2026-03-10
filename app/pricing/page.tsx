'use client';

import { useState } from 'react';
import AuthNav from '@/components/AuthNav';
import CheckoutModal from '@/components/CheckoutModal';
import { PLANS } from '@/lib/plans';

const FAQ = [
  {
    q: 'How accurate is the detection?',
    a: 'Paid plans use Hive AI — one of the most advanced AI-content detection APIs available, with 95%+ accuracy across all video types, not just faces. The free tier uses our standard model.',
  },
  {
    q: 'What video types does VeriFrame detect?',
    a: 'Any AI-generated or deepfake video — face swaps, full-body generation, synthetic backgrounds, and AI avatars. It\'s not limited to human content.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No contracts, no hidden fees. Cancel from your dashboard in one click and you keep access until the end of your billing period.',
  },
  {
    q: 'What counts as one detection?',
    a: 'One video upload = one detection. We extract frames automatically and run forensic analysis. Results are stored in your history.',
  },
];

export default function PricingPage() {
  const [selected, setSelected] = useState<{
    planName: string;
    price: number;
    priceId: string;
  } | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const plans = [
    {
      key: 'free',
      name: 'Free',
      price: 0,
      priceId: '',
      tagline: 'Try it out',
      description: 'See what VeriFrame can do — no card required.',
      features: [
        '3 detections / month',
        'Standard AI model',
        'Basic confidence score',
        'Web access',
      ],
      badge: null,
      highlight: false,
      ctaLabel: 'Get Started Free',
      ctaStyle: 'ghost',
    },
    {
      key: 'plus',
      name: 'Plus',
      price: PLANS.plus.price,
      priceId: PLANS.plus.priceId,
      tagline: 'For casual users',
      description: 'Enough detections to verify content you see daily.',
      features: PLANS.plus.features,
      badge: null,
      highlight: false,
      ctaLabel: 'Get Plus →',
      ctaStyle: 'outline',
    },
    {
      key: 'pro',
      name: 'Pro',
      price: PLANS.pro.price,
      priceId: PLANS.pro.priceId,
      tagline: 'For creators & researchers',
      description: 'The plan most people choose. Serious detection power.',
      features: PLANS.pro.features,
      badge: 'Most Popular',
      badgeStyle: 'amber',
      highlight: true,
      ctaLabel: 'Get Pro →',
      ctaStyle: 'primary',
    },
    {
      key: 'unlimited',
      name: 'Unlimited',
      price: PLANS.unlimited.price,
      priceId: PLANS.unlimited.priceId,
      tagline: 'For agencies & power users',
      description: 'Maximum volume, API access, and priority support.',
      features: PLANS.unlimited.features,
      badge: 'Best Value',
      badgeStyle: 'teal',
      highlight: false,
      ctaLabel: 'Get Unlimited →',
      ctaStyle: 'outline',
    },
  ];

  const handleCta = (plan: typeof plans[0]) => {
    if (plan.key === 'free') {
      window.location.href = '/auth/signup';
      return;
    }
    setSelected({ planName: plan.name, price: plan.price, priceId: plan.priceId });
  };

  return (
    <div className="min-h-screen bg-void">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid opacity-100" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-amber-glow opacity-[0.025] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10">
        <AuthNav />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-28">

          {/* Header */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-glow animate-pulse" />
              <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">Pricing</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-black text-slate-100 mb-4 leading-tight">
              Know what's real.<br />
              <span className="text-amber-glow">Before you share it.</span>
            </h1>
            <p className="text-slate-400 text-base max-w-lg mx-auto leading-relaxed">
              Frame-by-frame forensic AI detection. 95%+ accuracy on paid plans.
              Start free — no credit card needed.
            </p>

            {/* Social proof */}
            <div className="flex items-center justify-center gap-6 mt-6">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-glow text-sm">★★★★★</span>
                <span className="font-mono text-[10px] text-slate-500">Trusted by creators</span>
              </div>
              <span className="w-px h-4 bg-border" />
              <span className="font-mono text-[10px] text-slate-500">95%+ accuracy on paid plans</span>
              <span className="w-px h-4 bg-border" />
              <span className="font-mono text-[10px] text-slate-500">Cancel anytime</span>
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.key}
                className={`relative border rounded-2xl p-5 flex flex-col transition-all duration-200 hover:scale-[1.015] hover:-translate-y-0.5 ${
                  plan.highlight
                    ? 'border-amber-glow/60 bg-gradient-to-b from-amber-glow/8 to-amber-glow/3 shadow-lg shadow-amber-glow/10'
                    : 'border-border bg-surface hover:border-slate-600'
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                    <span className={`px-3 py-1 font-mono text-[10px] uppercase tracking-widest rounded-full font-bold whitespace-nowrap ${
                      plan.badgeStyle === 'amber'
                        ? 'bg-amber-glow text-void'
                        : 'bg-teal-400 text-void'
                    }`}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className={`mb-5 ${plan.badge ? 'mt-3' : ''}`}>
                  <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                    {plan.tagline}
                  </div>
                  <h2 className="font-display text-lg font-black text-slate-100 mb-1">
                    VeriFrame {plan.name}
                  </h2>
                  <p className="font-mono text-[10px] text-slate-500 leading-relaxed mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-end gap-1">
                    <span className={`font-display text-4xl font-black leading-none ${
                      plan.highlight ? 'text-amber-glow' : 'text-slate-100'
                    }`}>
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="font-mono text-xs text-slate-500 mb-1">/mo</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className={`mt-0.5 text-xs shrink-0 font-bold ${
                        plan.highlight ? 'text-amber-glow' : 'text-teal-400'
                      }`}>
                        ✓
                      </span>
                      <span className="font-mono text-[11px] text-slate-300 leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleCta(plan)}
                  className={`w-full py-3.5 font-display font-bold rounded-xl transition-all duration-200 text-sm min-h-[44px] ${
                    plan.ctaStyle === 'primary'
                      ? 'bg-amber-glow text-void hover:bg-amber-400 shadow-md shadow-amber-glow/20'
                      : plan.ctaStyle === 'outline'
                      ? 'border border-border text-slate-300 hover:border-amber-glow/60 hover:text-amber-glow bg-transparent'
                      : 'border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300 bg-transparent'
                  }`}
                >
                  {plan.ctaLabel}
                </button>

                {plan.key === 'free' && (
                  <p className="text-center font-mono text-[9px] text-slate-600 mt-2">
                    No credit card required
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Feature comparison nudge */}
          <p className="text-center font-mono text-[10px] text-slate-600 mt-6">
            All paid plans include Hive AI (95%+ accuracy) · Secured by Stripe · Cancel anytime
          </p>

          {/* What you get section */}
          <div className="mt-20 mb-16 max-w-2xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-glow animate-pulse" />
              <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">Why VeriFrame</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-100 mb-4">
              Not all deepfake detectors are equal.
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Most tools check for face swaps only. VeriFrame runs Hive AI on every frame —
              detecting AI avatars, full-body generation, and synthetic backgrounds that other tools miss.
              Paid plans get the full forensic engine.
            </p>
          </div>

          {/* Stat row */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-20">
            {[
              { stat: '95%+', label: 'Detection accuracy' },
              { stat: '<30s', label: 'Average scan time' },
              { stat: '100%', label: 'Frame-by-frame' },
            ].map(({ stat, label }) => (
              <div key={label} className="text-center border border-border rounded-xl p-4 bg-surface">
                <div className="font-display text-2xl font-black text-amber-glow mb-1">{stat}</div>
                <div className="font-mono text-[10px] text-slate-500 uppercase tracking-wide">{label}</div>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">FAQ</span>
              <h2 className="font-display text-2xl font-black text-slate-100 mt-2">Common questions</h2>
            </div>
            <div className="space-y-3">
              {FAQ.map((item, i) => (
                <div
                  key={i}
                  className="border border-border rounded-xl bg-surface overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                  >
                    <span className="font-mono text-xs text-slate-200 font-bold">{item.q}</span>
                    <span className={`font-mono text-slate-500 text-sm ml-4 shrink-0 transition-transform duration-200 ${
                      openFaq === i ? 'rotate-45' : ''
                    }`}>+</span>
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4">
                      <p className="font-mono text-[11px] text-slate-400 leading-relaxed">{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <p className="font-mono text-xs text-slate-500 mb-4">
              Still unsure? Start free — no credit card required.
            </p>
            <button
              onClick={() => window.location.href = '/auth/signup'}
              className="px-8 py-3.5 bg-amber-glow text-void font-display font-bold rounded-xl hover:bg-amber-400 transition-all duration-200 shadow-lg shadow-amber-glow/20"
            >
              Try VeriFrame Free →
            </button>
          </div>

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
