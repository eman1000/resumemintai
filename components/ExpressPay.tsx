// components/ExpressPay.tsx
// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentRequestButtonElement,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type Mode = 'subscription' | 'payment';

export default function ExpressPay({
  mode = 'subscription',
  amount = 499,             // one-time price in cents (e.g., €4.99) — only used in payment mode
  currency = 'eur',
  label = 'ResumeMint Pro', // shows in the Apple/Google sheet
  priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO, // used in subscription mode
  email,
}: {
  mode?: Mode;
  amount?: number;
  currency?: string;
  label?: string;
  priceId?: string;
  email?: string;
}) {
  const [paymentRequest, setPaymentRequest] = useState<stripe.paymentRequest.PaymentRequest|null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const stripe = await stripePromise;
      if (!stripe) return;

      const total = mode === 'payment'
        ? { label, amount }
        : { label: `${label} — first charge`, amount: 0 }; // if you want to show €0 free trial; else set your first-month price

      const pr = stripe.paymentRequest({
        country: 'IE',          // change to your primary country
        currency,
        total,
        requestPayerName: true,
        requestPayerEmail: true,
      });

      const can = await pr.canMakePayment();
      if (can) {
        setPaymentRequest(pr);
        setReady(true);
      }

      pr.on('paymentmethod', async (ev) => {
        try {
          if (mode === 'payment') {
            // ONE-TIME PAYMENT
            const r = await fetch('/api/payments/create-intent', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                payment_method: ev.paymentMethod.id,
                amount,
                currency,
                email: ev.payerEmail || email,
              }),
            }).then(r => r.json());

            if (r.error) throw new Error(r.error);

            // if requires action, confirm with the wallet
            if (r.client_secret) {
              const stripe = await stripePromise;
              const { error } = await stripe!.confirmCardPayment(r.client_secret, {
                payment_method: ev.paymentMethod.id,
              });
              if (error) throw error;
            }

            ev.complete('success');
            alert('Payment complete. Thanks!');
            return;
          }

          // SUBSCRIPTION
          const s = await fetch('/api/billing/start-subscription', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              payment_method: ev.paymentMethod.id,
              price_id: priceId,
              email: ev.payerEmail || email,
              // Optionally set: trial_days: 7
            }),
          }).then(r => r.json());

          if (s.error) throw new Error(s.error);

          // Confirm first invoice’s PaymentIntent if Stripe created one
          if (s.client_secret) {
            const stripe = await stripePromise;
            const { error } = await stripe!.confirmCardPayment(s.client_secret, {
              payment_method: ev.paymentMethod.id,
            });
            if (error) throw error;
          }

          ev.complete('success');
          alert('Subscription active. Welcome to ResumeMint Pro!');
        } catch (err: any) {
          ev.complete('fail');
          alert(err?.message || 'Payment failed');
        }
      });
    })();
  }, [mode, amount, currency, label, priceId, email]);

  if (!ready || !paymentRequest) return null;

  return (
    <Elements stripe={stripePromise}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <PaymentRequestButtonElement
          options={{
            paymentRequest,
            style: {
              paymentRequestButton: {
                type: 'buy',
                theme: 'dark',
                height: '44px',
              },
            },
          }}
        />
      </div>
    </Elements>
  );
}
