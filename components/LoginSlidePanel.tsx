'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, provider } from '@/app/firebase';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Optional message shown at top explaining why login is needed */
  reason?: string;
}

export default function LoginSlidePanel({ open, onClose, onSuccess, reason }: Props) {
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);

  // Reset state when panel opens
  useEffect(() => {
    if (open) {
      setStep('email');
      setEmail('');
      setPw('');
      setErr(null);
      setResetSent(false);
      setBusy(false);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function handleEmailContinue(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setErr('Please enter a valid email address.');
      return;
    }
    setStep('password');
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!pw) {
      setErr('Please enter your password.');
      return;
    }
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email, pw);
      onSuccess();
    } catch (e: any) {
      if (e?.code === 'auth/user-not-found' || e?.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, pw);
          onSuccess();
        } catch (ce: any) {
          setErr(humanize(ce));
        } finally {
          setBusy(false);
        }
        return;
      }
      setErr(humanize(e));
      setBusy(false);
    }
  }

  async function handleGoogleLogin() {
    setErr(null);
    setBusy(true);
    try {
      await signInWithPopup(auth, provider);
      onSuccess();
    } catch (e) {
      setErr(humanize(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) { setErr('Enter your email first.'); return; }
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setErr(null);
    } catch (e: any) {
      setErr(humanize(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[80] bg-black/40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slide panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 z-[90] h-full w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full overflow-y-auto p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>

          {/* Header */}
          <div className="mt-8 mb-6">
            <h2 className="text-2xl font-bold text-[#1d1d20]">Sign in</h2>
            {reason && (
              <p className="text-sm text-[#52525a] mt-2">{reason}</p>
            )}
            {!reason && (
              <p className="text-sm text-[#52525a] mt-2">
                Sign in to download your resume and access premium templates.
              </p>
            )}
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            className="w-full rounded-lg bg-white border border-gray-300 text-[#1d1d20] font-medium px-4 py-2.5 mb-4 hover:bg-gray-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            disabled={busy}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="text-xs text-[#a1a1aa] text-center my-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span>or use email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Email step */}
          {step === 'email' ? (
            <form onSubmit={handleEmailContinue} className="space-y-3">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Email address"
                className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2.5 text-[#1d1d20] placeholder:text-[#a1a1aa] focus:border-brand focus:ring-1 focus:ring-brand outline-none transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              {err && <p className="text-sm text-red-600">{err}</p>}
              <button
                type="submit"
                className="w-full rounded-lg bg-brand text-white py-2.5 font-semibold hover:bg-brand-700 transition-colors"
                disabled={busy}
              >
                Next
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-[#52525a] bg-gray-50 rounded-lg px-3 py-2">
                <span className="truncate">{email}</span>
                <button
                  type="button"
                  className="text-brand hover:underline text-xs flex-shrink-0"
                  onClick={() => { setStep('email'); setErr(null); setPw(''); setResetSent(false); }}
                >
                  Change
                </button>
              </div>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2.5 text-[#1d1d20] placeholder:text-[#a1a1aa] focus:border-brand focus:ring-1 focus:ring-brand outline-none transition"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoFocus
              />
              {err && <p className="text-sm text-red-600">{err}</p>}
              {resetSent && <p className="text-sm text-[#00b67a]">Password reset email sent! Check your inbox.</p>}
              <button
                type="submit"
                className="w-full rounded-lg bg-brand text-white py-2.5 font-semibold hover:bg-brand-700 transition-colors"
                disabled={busy}
              >
                {busy ? 'Please wait...' : 'Sign in'}
              </button>
              <button
                type="button"
                className="w-full text-sm text-brand hover:underline"
                onClick={handleForgotPassword}
                disabled={busy}
              >
                Forgot password?
              </button>
            </form>
          )}

          <p className="text-center text-xs text-[#a1a1aa] mt-6">
            No account yet? Just enter your email and password to create one.
          </p>
        </div>
      </div>
    </>
  );
}

function humanize(e: any) {
  const code = e?.code || '';
  if (code === 'auth/wrong-password') return 'Wrong password.';
  if (code === 'auth/invalid-email') return 'Invalid email address.';
  if (code === 'auth/invalid-credential') return 'Invalid credentials. Try again or create a new account.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Try again later.';
  if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
  return e?.message || 'Something went wrong.';
}
