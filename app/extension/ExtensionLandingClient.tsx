"use client";

import * as React from "react";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import LoginSlidePanel from "@/components/LoginSlidePanel";
import SubscribeSlidePanel from "@/components/SubscribeSlidePanel";
import { useAuthStatus } from "@/hooks/useAuthStatus";

// Replace this with the real Chrome Web Store URL once the listing is live.
const CHROME_STORE_URL =
  process.env.NEXT_PUBLIC_CHROME_STORE_URL ||
  "https://chromewebstore.google.com/search/resumemint";

export default function ExtensionLandingClient() {
  const { isAuthenticated, isSubscribed, loading } = useAuthStatus();
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [subscribeOpen, setSubscribeOpen] = React.useState(false);

  const onInstallClick = () => {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }
    if (!isSubscribed) {
      setSubscribeOpen(true);
      return;
    }
    window.open(CHROME_STORE_URL, "_blank", "noopener");
  };

  return (
    <>
      <SiteNav />

      <header className="bg-white">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <span className="inline-block text-[11px] font-semibold tracking-[0.18em] uppercase text-amber-700 bg-amber-50 rounded-full px-3 py-1">
            PRO feature
          </span>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold text-[#1d1d20]">
            ResumeMint Apply Extension
          </h1>
          <p className="mt-4 text-[#52525a] text-lg max-w-2xl mx-auto">
            Stop typing the same name, email, and bullets into every job application form.
            Install the Chrome extension and ResumeMint will auto-fill any supported ATS using
            your saved resume.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onInstallClick}
              disabled={loading}
              className="btn-primary text-base px-7 py-3 disabled:opacity-60"
            >
              {!isAuthenticated
                ? "Sign in to install"
                : !isSubscribed
                  ? "Unlock with PRO"
                  : "Install from Chrome Web Store"}
            </button>
            <Link href="/pricing" className="text-sm text-brand hover:underline">
              See pricing →
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-[#f8fbfc]">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#1d1d20]">
            How it works
          </h2>
          <div className="mt-10 grid md:grid-cols-3 gap-6 text-sm">
            <Step
              n="1"
              title="Install + sign in"
              body="One-click install from the Chrome Web Store, then pair the extension to your ResumeMint account."
            />
            <Step
              n="2"
              title="Open any job posting"
              body="On Greenhouse, Lever, Ashby, Workable, Workday, LinkedIn or Indeed — the side panel detects the ATS automatically."
            />
            <Step
              n="3"
              title="Click Fill, review, submit"
              body="Resume data fills the form in seconds. You always click Submit yourself — never silent applications."
            />
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-[#1d1d20]">Supported sites today</h2>
          <ul className="mt-4 grid grid-cols-2 gap-y-2 text-sm text-[#52525a]">
            {[
              "Greenhouse",
              "Lever",
              "Ashby",
              "Workable",
              "Workday",
              "LinkedIn Jobs",
              "Indeed",
              "Any form (AI fallback)",
            ].map((s) => (
              <li key={s} className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                {s}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-[#52525a]">
            The extension never auto-submits unless you turn that on in its settings — fill is
            always reviewable.
          </p>
        </div>
      </section>

      <LoginSlidePanel
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => setLoginOpen(false)}
        reason="Sign in to install the ResumeMint Apply extension."
      />
      <SubscribeSlidePanel open={subscribeOpen} onClose={() => setSubscribeOpen(false)} />

      <SiteFooter />
    </>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-lg bg-white border border-gray-200 p-5">
      <div className="w-9 h-9 rounded-full bg-brand-50 text-brand font-bold text-lg flex items-center justify-center">
        {n}
      </div>
      <h3 className="mt-3 font-semibold text-[#1d1d20]">{title}</h3>
      <p className="mt-1 text-sm text-[#52525a] leading-relaxed">{body}</p>
    </div>
  );
}
