import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export const runtime = 'nodejs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Extended types to cover fields Stripe SDK types don't expose directly
type StripeInvoice = Stripe.Invoice & {
  subscription?: string;
  payment_intent?: string;
};

type StripeSubscription = Stripe.Subscription & {
  current_period_end?: number;
  items: {
    data: Array<{
      price: { id: string };
    }>;
  };
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Webhook signature failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as StripeSubscription;
        await handleSubscriptionChange(sub);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as StripeSubscription;
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'cancelled',
            stripe_subscription_id: sub.id,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', sub.customer as string);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as StripeInvoice;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          await handleSubscriptionChange(sub as StripeSubscription);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as StripeInvoice;
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', invoice.customer as string);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function handleSubscriptionChange(sub: StripeSubscription) {
  const customerId = sub.customer as string;
  const priceId = sub.items.data[0]?.price.id;

  const plan =
    priceId === process.env.STRIPE_PRO_PRICE_ID ? 'pro' :
    priceId === process.env.STRIPE_UNLIMITED_PRICE_ID ? 'unlimited' :
    'unknown';

  // current_period_end may be on sub directly or nested in billing_cycle_anchor
  const periodEnd = (sub as any).current_period_end
    ? new Date((sub as any).current_period_end * 1000).toISOString()
    : null;

  await supabaseAdmin
    .from('subscriptions')
    .update({
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      status: sub.status,
      plan,
      ...(periodEnd ? { current_period_end: periodEnd } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);
}