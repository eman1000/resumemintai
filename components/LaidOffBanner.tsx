"use client";

import * as React from "react";
import Link from "next/link";
import { X } from "lucide-react";

const STORAGE_KEY = "rm.laidOffBanner.dismissed.v1";

export default function LaidOffBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEY);
      if (!dismissed) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const onDismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
  };

  if (!visible) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-100">
      <div className="max-w-site mx-auto px-4 py-2.5 flex items-center gap-3">
        <p className="flex-1 text-sm text-amber-900 leading-snug">
          <span className="font-semibold">Recently laid off?</span>{" "}
          <span className="hidden sm:inline">Here&apos;s a free 7-day comeback plan — rebuild, tailor, and apply faster.</span>
          <span className="sm:hidden">Free 7-day comeback plan inside.</span>{" "}
          <Link
            href="/laid-off"
            className="font-semibold underline underline-offset-2 hover:text-amber-950"
          >
            See the plan →
          </Link>
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 text-amber-800 hover:text-amber-950 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
