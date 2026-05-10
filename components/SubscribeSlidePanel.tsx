'use client';

import React, { useEffect } from 'react';
import SubscribeAllPay from './SubscribeAllPay';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Optional title shown in the dark header bar (defaults to "Account") */
  title?: string;
  /** Optional headline shown above the pricing card */
  heading?: string;
}

export default function SubscribeSlidePanel({
  open,
  onClose,
  title = 'Account',
  heading = 'Activate your subscription',
}: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Backdrop (desktop only — mobile is full screen so no backdrop needed) */}
      <div
        className={`
          fixed inset-0 z-[80] bg-black/40 transition-opacity duration-300
          hidden md:block
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscribe-panel-title"
        className={`
          fixed top-0 right-0 z-[90] h-full bg-white shadow-2xl
          w-full md:max-w-md
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Dark header bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#1d1d20] text-white">
          <div id="subscribe-panel-title" className="text-base font-medium">
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="
              grid place-items-center
              w-9 h-9 p-0 rounded-full border border-white/40
              text-white/90 hover:bg-white/10 transition-colors
              shrink-0
            "
            style={{ lineHeight: 0 }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
              style={{ display: "block" }}
            >
              <line x1="3" y1="3" x2="11" y2="11" />
              <line x1="11" y1="3" x2="3" y2="11" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <h2 className="text-2xl font-bold text-[#1d1d20] mb-5">{heading}</h2>

          {/* Only mount the Stripe flow while open so we don't create a SetupIntent up-front */}
          {open && <SubscribeAllPay />}

          <p className="mt-5 text-xs text-[#52525a] leading-relaxed">
            After receipt of your payment, the product will be delivered to you immediately and you waive your right of withdrawal.
            After 14 days, your subscription will automatically be renewed. You can cancel your subscription at any time.
          </p>
        </div>
      </div>
    </>
  );
}
