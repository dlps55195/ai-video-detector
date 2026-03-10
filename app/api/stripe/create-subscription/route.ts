import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId } = await req.json();

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID missing.' }, { status: 400 });
    }

    const userId = session.user.id;
    const email = session.user.email!;

    // Check for existing Stripe customer
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

    // Step 1: Create a SetupIntent to collect card details
    // Step 2: After card is saved, create subscription using that payment method
    // This is more reliable than relying on invoice.payment_intent in live mode

    // Create a PaymentIntent directly for the first payment
    // then the subscription handles renewals automatically
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: {
        priceId,
        userId,
      },
    });

    if (!setupIntent.client_secret) {
      return NextResponse.json({ error: 'Failed to create setup intent.' }, { status: 500 });
    }

    // Store the priceId so we can create the subscription after card is confirmed
    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
      customerId,
      priceId,
      mode: 'setup',
    });

  } catch (err: any) {
    console.error('create-subscription error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}