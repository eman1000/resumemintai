"use client";

import { useEffect } from "react";

export function MobilePreviewOverlay({
  open,
  onClose,
  children,
  title = "Preview",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC to close (nice on tablets / keyboards)
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* panel */}
      <div className="absolute inset-0 bg-white flex flex-col">
        <div className="sticky top-0 z-10 border-b bg-white">
          <div className="flex items-center justify-between px-3 py-3">
            <div className="font-semibold">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-2 border"
            >
              Close
            </button>
          </div>
        </div>

        {/* content scroll */}
        <div className="flex-1 overflow-auto p-3">
          {children}
        </div>
      </div>
    </div>
  );
}
