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

    const { setupIntentId, customerId, priceId } = await req.json();

    // Retrieve the confirmed SetupIntent to get the payment method
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

    if (setupIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Card not confirmed yet.' }, { status: 400 });
    }

    const paymentMethodId = setupIntent.payment_method as string;

    // Attach payment method as default on customer
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Now create the subscription — it will charge immediately using the saved card
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      status: subscription.status,
    });

  } catch (err: any) {
    console.error('confirm-subscription error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}