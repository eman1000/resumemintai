'use client';
import { useState } from 'react';
import PageShell from '@/components/PageShell';
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '@/app/firebase';

export default function Unsubscribe() {
  const [loading, setLoading] = useState(false);

  const onGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, provider);
      window.location.href = '/account';
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="Unsubscribe" subtitle="Manage your subscription">
      <div className="prose prose-invert max-w-none">
        <p>To change your plan or cancel your subscription, you need to be logged in. This helps us securely verify your account and access your subscription settings.</p>
        <h3>How to proceed</h3>
        <ol>
          <li>Click the button below to log in using Google.</li>
          <li>After login, you will be redirected to your account page.</li>
          <li>On the <strong>Manage Subscription</strong> page, you can change your plan or cancel your subscription.</li>
        </ol>
        <button onClick={onGoogle} className="mt-4 px-4 py-2 rounded-xl bg-white text-black font-semibold" disabled={loading}>
          {loading ? 'Continuing…' : 'Continue with Google'}
        </button>
      </div>
    </PageShell>
  );
}
