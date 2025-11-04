// app/contact/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

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
    // If keyman_id present in URL and not already stored, persist it
    const fromUrl = getKeymanIdFromUrl();
    if (fromUrl && !getStoredKeymanId()) {
      try { localStorage.setItem('keyman_id', fromUrl); } catch {}
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    // quick client-side checks
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
          // optional: you can pass path/ref, but API already infers from headers
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.detail || j?.error || 'submit_failed');

      toast.success('Thanks! We’ll get back to you shortly.');
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
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight mb-6">Contact us</h1>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6"
        >
          {/* Hidden keyman_id if present */}
          {keyman_id ? <input type="hidden" name="keyman_id" value={keyman_id} /> : null}

          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2 outline-none"
              placeholder="Your name"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2 outline-none"
              placeholder="you@domain.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Subject (optional)</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2 outline-none"
              placeholder="How can we help?"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2 outline-none"
              placeholder="Write your message here…"
              required
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-violet-500 hover:bg-violet-500/90 text-white font-semibold py-3 transition disabled:opacity-60"
          >
            {busy ? 'Sending…' : 'Send message'}
          </button>
        </form>

        <p className="mt-4 text-xs text-neutral-500">
          We’ll reply to your email as soon as possible.
        </p>
      </div>
    </main>
  );
}
