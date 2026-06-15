"use client";

import * as React from "react";
import Link from "next/link";
import { Download, Lock, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import LoginSlidePanel from "@/components/LoginSlidePanel";
import SubscribeSlidePanel from "@/components/SubscribeSlidePanel";
import { useAuthStatus } from "@/hooks/useAuthStatus";

const DOWNLOAD_URL = "/extension/resumemint-apply-latest.zip";
const EXTENSION_VERSION = "0.6.0";

export default function InstallClient() {
  const { isAuthenticated, isSubscribed, loading } = useAuthStatus();
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [subscribeOpen, setSubscribeOpen] = React.useState(false);

  const onDownloadClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (loading) { e.preventDefault(); return; } // don't download before gating resolves
    if (!isAuthenticated) {
      e.preventDefault();
      setLoginOpen(true);
      return;
    }
    if (!isSubscribed) {
      e.preventDefault();
      setSubscribeOpen(true);
      return;
    }
  };

  // While auth + subscription are still resolving, show a single stable state
  // instead of flashing through Sign-in → Unlock → Download.
  const buttonLabel = loading
    ? "Checking…"
    : !isAuthenticated
      ? "Sign in to download"
      : !isSubscribed
        ? "Unlock with PRO"
        : `Download for Chrome (v${EXTENSION_VERSION})`;

  const ButtonIcon = !loading && isAuthenticated && isSubscribed ? Download : Lock;

  return (
    <>
      <SiteNav />

      {/* Hero */}
      <header className="bg-white">
        <div className="max-w-3xl mx-auto px-4 py-14 text-center">
          <span className="inline-block text-[11px] font-semibold tracking-[0.18em] uppercase text-amber-700 bg-amber-50 rounded-full px-3 py-1">
            PRO feature
          </span>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold text-[#1d1d20]">
            Install ResumeMint Apply
          </h1>
          <p className="mt-4 text-[#52525a] text-lg max-w-2xl mx-auto">
            Download the extension and follow the 4 steps below. It takes about a minute.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={DOWNLOAD_URL}
              onClick={onDownloadClick}
              download
              className={`btn-primary text-base px-7 py-3 inline-flex items-center gap-2 ${loading ? "opacity-60 pointer-events-none" : ""}`}
              aria-disabled={loading}
            >
              <ButtonIcon className="w-4 h-4" />
              {buttonLabel}
            </a>
            <Link href="/extension" className="text-sm text-brand hover:underline">
              ← Back to overview
            </Link>
          </div>

          <p className="mt-4 text-xs text-[#52525a]">
            Chrome 114 or newer · Brave and Edge also supported · ~190 KB
          </p>
        </div>
      </header>

      {/* Why "load unpacked" — explainer */}
      <section className="bg-[#fff7ed]">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900 leading-relaxed">
              <span className="font-semibold">Heads up:</span> while we&apos;re finishing our
              Chrome Web Store listing, you&apos;ll install the extension via{" "}
              <span className="font-medium">Developer Mode</span> — a one-time toggle in Chrome.
              The Web Store version drops automatically once approved.
            </p>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1d1d20]">
            4 steps to install
          </h2>

          <ol className="mt-8 space-y-5">
            <Step
              n={1}
              title="Download the extension"
              body={
                <>
                  Click the download button above. You&apos;ll get a file called{" "}
                  <code className="px-1.5 py-0.5 rounded bg-gray-100 text-[12px] font-mono">
                    resumemint-apply-latest.zip
                  </code>
                  .
                </>
              }
            />
            <Step
              n={2}
              title="Unzip the file"
              body={
                <>
                  Find the download (usually in <code className="px-1.5 py-0.5 rounded bg-gray-100 text-[12px] font-mono">~/Downloads</code>),
                  and unzip it. You&apos;ll get a folder called{" "}
                  <code className="px-1.5 py-0.5 rounded bg-gray-100 text-[12px] font-mono">
                    resumemint-apply-latest
                  </code>
                  . <span className="text-[#52525a]">Keep this folder somewhere safe — deleting it disables the extension.</span>
                </>
              }
            />
            <Step
              n={3}
              title="Open Chrome's extensions page"
              body={
                <>
                  Go to{" "}
                  <code className="px-1.5 py-0.5 rounded bg-gray-100 text-[12px] font-mono">
                    chrome://extensions
                  </code>{" "}
                  in your address bar, then turn on{" "}
                  <span className="font-medium">Developer mode</span> (top-right toggle).
                </>
              }
            />
            <Step
              n={4}
              title='Click "Load unpacked" and pick the folder'
              body={
                <>
                  Hit <span className="font-medium">Load unpacked</span> (top-left), select the
                  unzipped folder from step 2, and you&apos;re done. The ResumeMint puzzle icon
                  will appear in your Chrome toolbar — pin it for easy access.
                </>
              }
            />
          </ol>

          <div className="mt-10 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-emerald-900">Pair the extension</h3>
                <p className="text-sm text-emerald-900/90 mt-1 leading-relaxed">
                  After installing, click the toolbar icon to open the side panel, then sign in
                  through the pairing page. Your resume syncs automatically.
                </p>
                <Link
                  href="/extension/connect"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:text-emerald-900 underline"
                >
                  Open the pairing page <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="bg-[#f8fbfc]">
        <div className="max-w-3xl mx-auto px-4 py-14">
          <h2 className="text-2xl font-bold text-[#1d1d20]">Troubleshooting</h2>

          <div className="mt-6 divide-y divide-gray-200">
            <Faq
              q="Chrome blocked my download or flagged the file"
              a={
                <>
                  Some browsers warn about <em>any</em> non-Web-Store extension. Choose
                  &quot;Keep&quot; in the download bar. If your IT department blocks unpacked
                  extensions, wait for our Chrome Web Store listing or contact us.
                </>
              }
            />
            <Faq
              q="I don't see Developer Mode"
              a={
                <>
                  Make sure you&apos;re on <code className="px-1 py-0.5 rounded bg-gray-100 text-[12px] font-mono">chrome://extensions</code>{" "}
                  (not chrome.google.com). Developer mode is the toggle in the top-right corner.
                </>
              }
            />
            <Faq
              q='"This extension may have been corrupted" error'
              a={
                <>
                  Re-unzip the file (sometimes the OS double-extracts it). The folder you select
                  in step 4 must contain <code className="px-1 py-0.5 rounded bg-gray-100 text-[12px] font-mono">manifest.json</code>{" "}
                  at the top level.
                </>
              }
            />
            <Faq
              q="The side panel doesn't open when I click the toolbar icon"
              a={
                <>
                  You need Chrome 114 or newer. Go to{" "}
                  <code className="px-1 py-0.5 rounded bg-gray-100 text-[12px] font-mono">chrome://settings/help</code>{" "}
                  to update.
                </>
              }
            />
            <Faq
              q="I want to uninstall"
              a={
                <>
                  Go to <code className="px-1 py-0.5 rounded bg-gray-100 text-[12px] font-mono">chrome://extensions</code>,
                  find ResumeMint Apply, and click Remove. You can also delete the unzipped
                  folder.
                </>
              }
            />
          </div>

          <p className="mt-8 text-sm text-[#52525a]">
            Still stuck? Email{" "}
            <a
              href="mailto:support@resumemintai.com"
              className="text-brand font-medium hover:underline"
            >
              support@resumemintai.com
            </a>{" "}
            and we&apos;ll get you running.
          </p>
        </div>
      </section>

      {/* Bottom CTA — same gated download */}
      <section className="bg-brand-50">
        <div className="max-w-3xl mx-auto px-4 py-14 text-center">
          <h2 className="text-2xl font-bold text-[#1d1d20]">Ready to start auto-applying?</h2>
          <p className="mt-3 text-[#52525a]">Download once, apply to dozens of jobs in an afternoon.</p>
          <a
            href={DOWNLOAD_URL}
            onClick={onDownloadClick}
            download
            className={`btn-primary mt-6 inline-flex items-center gap-2 text-base ${loading ? "opacity-60 pointer-events-none" : ""}`}
            aria-disabled={loading}
          >
            <ButtonIcon className="w-4 h-4" />
            {buttonLabel}
          </a>
        </div>
      </section>

      <LoginSlidePanel
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => setLoginOpen(false)}
        reason="Sign in to download the ResumeMint Apply extension."
      />
      <SubscribeSlidePanel open={subscribeOpen} onClose={() => setSubscribeOpen(false)} />

      <SiteFooter />
    </>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-brand text-white font-bold text-base flex items-center justify-center">
        {n}
      </div>
      <div className="flex-1 pt-1">
        <h3 className="font-semibold text-[#1d1d20]">{title}</h3>
        <p className="mt-1 text-sm text-[#52525a] leading-relaxed">{body}</p>
      </div>
    </li>
  );
}

function Faq({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <details className="group py-4">
      <summary className="cursor-pointer list-none font-medium text-[#1d1d20] flex items-center justify-between">
        {q}
        <span className="text-[#a1a1aa] group-open:rotate-45 transition-transform text-lg leading-none">
          +
        </span>
      </summary>
      <div className="mt-3 text-sm text-[#52525a] leading-relaxed">{a}</div>
    </details>
  );
}
