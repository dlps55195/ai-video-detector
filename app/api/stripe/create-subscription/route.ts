import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId } = await req.json();

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is missing. Check NEXT_PUBLIC_STRIPE_PRO_PRICE_ID and NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID are set in Vercel.' }, { status: 400 });
    }

    const userId = session.user.id;
    const email = session.user.email!;

    // Check if user already has a Stripe customer
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    let customerId = existingSub?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;

      await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        status: 'inactive',
        updated_at: new Date().toISOString(),
      });
    }

    // Create subscription (incomplete until payment confirmed)
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice & {
      payment_intent?: Stripe.PaymentIntent;
    };

    if (!invoice) {
      return NextResponse.json({ error: 'No invoice returned from Stripe.' }, { status: 500 });
    }

    if (!invoice.payment_intent) {
      return NextResponse.json({ error: 'No payment intent on invoice. The subscription may already be active or the price ID is invalid.' }, { status: 500 });
    }

    const clientSecret = invoice.payment_intent.client_secret;

    if (!clientSecret) {
      return NextResponse.json({ error: 'No client secret returned. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret,
    });
  } catch (err: any) {
    console.error('create-subscription error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
