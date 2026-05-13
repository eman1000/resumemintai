// app/contact/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

function getKeymanIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const u = new URL(window.location.href);
  return u.searchParams.get('keyman_id');
}

function getStoredKeymanId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const k = localStorage.getItem('keyman_id');
    return k || null;
  } catch {
    return null;
  }
}

export default function ContactPage() {
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const keyman_id = useMemo(
    () => getKeymanIdFromUrl() ?? getStoredKeymanId(),
    []
  );

  useEffect(() => {
    const fromUrl = getKeymanIdFromUrl();
    if (fromUrl && !getStoredKeymanId()) {
      try { localStorage.setItem('keyman_id', fromUrl); } catch {}
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    if (!name.trim() || name.trim().length < 2) {
      toast.error('Please enter your name');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error('Please enter a valid email');
      return;
    }
    if (!message.trim() || message.trim().length < 2) {
      toast.error('Please add a message');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim() || null,
          message: message.trim(),
          keyman_id,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.detail || j?.error || 'submit_failed');

      toast.success('Thanks! We\'ll get back to you shortly.');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Could not send your message');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteNav />
      <main className="min-h-screen bg-[#f8fbfc] px-4 py-16">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-3xl font-semibold text-[#1d1d20] mb-6">Contact us</h1>

          <form
            onSubmit={submit}
            className="space-y-4 rounded-xl border border-gray-200 bg-white shadow-md p-6"
          >
            {keyman_id ? <input type="hidden" name="keyman_id" value={keyman_id} /> : null}

            <div>
              <label className="block text-sm text-[#52525a] mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[#1d1d20] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                placeholder="Your name"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-[#52525a] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[#1d1d20] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                placeholder="you@domain.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-[#52525a] mb-1">Subject (optional)</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[#1d1d20] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                placeholder="How can we help?"
              />
            </div>

            <div>
              <label className="block text-sm text-[#52525a] mb-1">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[#1d1d20] outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-y"
                placeholder="Write your message here…"
                required
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full btn-primary py-3 transition disabled:opacity-60"
            >
              {busy ? 'Sending…' : 'Send message'}
            </button>
          </form>

          <p className="mt-4 text-xs text-[#a1a1aa]">
            We&apos;ll reply to your email as soon as possible.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
