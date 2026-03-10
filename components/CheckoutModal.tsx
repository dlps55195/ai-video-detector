'use client';

import { useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe-client';

// ── Inner form (must be inside <Elements>) ─────────────────────────────────
function CheckoutForm({
  planName,
  price,
  onSuccess,
  onClose,
}: {
  planName: string;
  price: number;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard?subscription=success`,
      },
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed');
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Plan summary */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-panel border border-border">
        <div>
          <p className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Selected Plan</p>
          <p className="font-display font-bold text-slate-100">VeriFrame {planName}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-black text-amber-glow">${price}</p>
          <p className="font-mono text-[10px] text-slate-500">/month</p>
        </div>
      </div>

      {/* Stripe Payment Element — styled to match VeriFrame dark UI */}
      <div className="rounded-lg overflow-hidden border border-border">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {error && (
        <p className="font-mono text-xs text-signal-fake bg-signal-fake/5 border border-signal-fake/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-3.5 bg-amber-glow text-void font-display font-bold rounded-xl hover:bg-amber-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed glow-amber"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Processing...
          </span>
        ) : (
          `Subscribe · $${price}/mo`
        )}
      </button>

      <p className="text-center font-mono text-[10px] text-slate-600">
        Secured by Stripe · Cancel anytime · No hidden fees
      </p>
    </form>
  );
}

// ── Modal wrapper ──────────────────────────────────────────────────────────
export default function CheckoutModal({
  planName,
  price,
  priceId,
  onClose,
}: {
  planName: string;
  price: number;
  priceId: string;
  onClose: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Kick off subscription creation when modal opens
  const initSubscription = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create subscription');
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-init on mount
  if (!clientSecret && !loading && !error) {
    initSubscription();
  }

  // Stripe Elements appearance matching VeriFrame dark theme
  const appearance = {
    theme: 'night' as const,
    variables: {
      colorPrimary: '#F59E0B',
      colorBackground: '#0F1117',
      colorText: '#e2e8f0',
      colorTextSecondary: '#64748b',
      colorDanger: '#ef4444',
      fontFamily: 'ui-monospace, monospace',
      borderRadius: '8px',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': {
        backgroundColor: '#1a1d27',
        border: '1px solid #2a2d3a',
        color: '#e2e8f0',
      },
      '.Input:focus': {
        border: '1px solid #F59E0B',
        boxShadow: '0 0 0 1px #F59E0B',
      },
      '.Label': {
        color: '#94a3b8',
        fontFamily: 'ui-monospace, monospace',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      },
      '.Tab': {
        backgroundColor: '#1a1d27',
        border: '1px solid #2a2d3a',
        color: '#94a3b8',
      },
      '.Tab--selected': {
        backgroundColor: '#1e2130',
        border: '1px solid #F59E0B',
        color: '#F59E0B',
      },
    },
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-glow animate-pulse" />
            <span className="font-mono text-xs text-slate-400 uppercase tracking-widest">Checkout</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-panel border border-border flex items-center justify-center text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors font-mono text-sm"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-signal-real/10 border border-signal-real/30 flex items-center justify-center mx-auto text-2xl">
                ✓
              </div>
              <h3 className="font-display text-xl font-bold text-signal-real">Payment Successful</h3>
              <p className="font-mono text-xs text-slate-500">Your subscription is now active.</p>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="mt-4 px-6 py-2.5 bg-amber-glow text-void font-display font-bold rounded-lg hover:bg-amber-400 transition-colors"
              >
                Go to Dashboard →
              </button>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <svg className="animate-spin w-6 h-6 text-amber-glow" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">Initializing...</span>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <p className="font-mono text-sm text-signal-fake">{error}</p>
              <button
                onClick={initSubscription}
                className="font-mono text-xs text-amber-glow hover:text-amber-400 transition-colors"
              >
                Try again →
              </button>
            </div>
          ) : clientSecret ? (
            <Elements
              stripe={getStripe()}
              options={{ clientSecret, appearance }}
            >
              <CheckoutForm
                planName={planName}
                price={price}
                onSuccess={() => setSuccess(true)}
                onClose={onClose}
              />
            </Elements>
          ) : null}
        </div>
      </div>
    </div>
  );
}
