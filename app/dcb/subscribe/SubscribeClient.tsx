"use client";

import React, { useState } from "react";
import Link from "next/link";

type View = "subscribe" | "pin" | "success";

export default function DcbSubscribeClient() {
  const [view, setView] = useState<View>("subscribe");
  const [msisdn, setMsisdn] = useState("");
  const [pin, setPin] = useState("");

  return (
    <main className="min-h-screen bg-white text-neutral-900 flex justify-center">
      <div className="w-full max-w-md px-4 py-6 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between mb-4">
          <div className="text-xl font-semibold"><a className="flex items-center gap-2" href="/"><span className="inline-block w-7 h-7 rounded bg-violet-500"></span><span className="font-semibold">ResumeMint</span></a></div>
          <Link href="/" className="text-sm underline hover:no-underline">Exit</Link>
        </header>

            {/* Promo graphic (≤ 1/3 of screen) */}
            <div
            className="w-full mb-4 flex items-center justify-center"
            style={{ maxHeight: "30vh" }}
            aria-hidden="true"
            >
            {/* Prefer static PNG/SVG to meet MCP guidance */}
            <img
                src="/images/creative.png"        // or "/creative.gif" if you must use the GIF
                alt="Illustration: mobile with verified check"
                className="max-h-[15vh] h-auto w-auto rounded-xl border border-neutral-200 p-3 shadow-sm"
            />
            </div>
        {/* SUBSCRIBE */}
{view === "subscribe" && (
  <section aria-labelledby="heading-subscribe">
    <div className="rounded-2xl border border-neutral-200 shadow-lg bg-white p-5">
      <h1 id="heading-subscribe" className="text-lg font-semibold text-center">
        Create ATS-friendly resumes
      </h1>
      <p className="text-sm text-neutral-700 mt-1 text-center">
        Unlimited resumes &amp; revisions while your plan is active.
      </p>

      <div className="mt-4">
        <p className="font-bold text-lg text-center">
          £4.50 every 3 days (recurring) — cancel anytime
        </p>
        <p className="text-sm mt-1 text-center">
          <strong>Charges will be added to your mobile phone bill.</strong>
        </p>
      </div>

      <form
        className="mt-5"
        onSubmit={(e) => {
          e.preventDefault();
          setView("pin"); // demo only
        }}
      >
        <label htmlFor="msisdn" className="block text-sm font-medium">
          Enter mobile number
        </label>
        <input
          id="msisdn"
          name="msisdn"
          type="tel"
          inputMode="tel"
          pattern="^0[0-9]{9,10}$|^(\\+44|44)[0-9]{9,10}$"
          placeholder="07XXXXXXXXX"
          required
          value={msisdn}
          onChange={(e) => setMsisdn(e.target.value)}
          className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-neutral-900"
          aria-describedby="pin-help"
        />
        <p id="pin-help" className="mt-2 text-xs text-neutral-600">
          You’ll receive a PIN to confirm your subscription.
        </p>

        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-neutral-900 text-white py-3 text-base font-semibold hover:opacity-90"
        >
          Subscribe now
        </button>
      </form>
    </div>
  </section>
)}


      {/* PIN */}
{view === "pin" && (
  <section aria-labelledby="heading-pin">
    <div className="rounded-2xl border border-neutral-200 shadow-lg bg-white p-5">
      <h1 id="heading-pin" className="text-lg font-semibold">
        Enter your PIN to confirm
      </h1>
      <p className="text-sm text-neutral-700 mt-1">
        For: <span className="font-medium">{msisdn || "07XXXXXXXXX"}</span>
      </p>

      <div className="mt-4">
        <p className="font-bold text-lg">
          £4.50 every 3 days (recurring) — cancel anytime
        </p>
        <p className="text-sm mt-1">
          <strong>Charges will be added to your mobile phone bill.</strong>
        </p>
      </div>

      <form
        className="mt-5"
        onSubmit={(e) => {
          e.preventDefault();
          setView("success"); // demo only
        }}
      >
        <label htmlFor="pin" className="block text-sm font-medium">
          Enter your PIN code
        </label>
        <input
          id="pin"
          name="pin"
          type="text"
          inputMode="numeric"
          pattern="^[0-9]{4,8}$"
          placeholder="XXXX"
          required
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base tracking-widest text-center outline-none focus:ring-2 focus:ring-neutral-900"
        />

        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-neutral-900 text-white py-3 text-base font-semibold hover:opacity-90"
        >
          Confirm
        </button>

        <button
          type="button"
          onClick={() => setView("subscribe")}
          className="mt-3 w-full rounded-lg border border-neutral-300 py-2 text-sm"
        >
          Cancel payment
        </button>
      </form>
    </div>
  </section>
)}


        {/* SUCCESS */}
        {view === "success" && (
          <section aria-labelledby="heading-success">
            <h1 id="heading-success" className="text-lg font-semibold">Your payment has been successful</h1>
            <p className="mt-2">Your mobile phone bill has been charged <strong>£4.50</strong>.</p>
            <Link href="/app" className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-pink-600 text-white py-3 text-base font-semibold hover:opacity-90">
              Continue
            </Link>
            <p className="mt-4 text-xs text-neutral-600">
              If you did not intend to subscribe, contact Customer Care for a refund review. You can cancel any time via the Unsubscribe page.
            </p>
          </section>
        )}

        {/* Footer / compliance */}
        <div className="mt-6 text-sm">
          <div className="flex items-center gap-4 text-center">
            <Link href="/terms" className="underline hover:no-underline">Terms&amp;Conditions</Link>
            <a href="mailto:support@resumemintai.com" className="underline hover:no-underline">Contact Us</a>
          </div>
          <p className="mt-2">support@resumemintai.com (Mon–Fri 09:00–18:00 UK)</p>
          <p className="mt-1">Service Provided By: Plenqor LLC</p>
          <p className="mt-1 text-xs text-neutral-600">Cancel anytime via the Unsubscribe page or Customer Care.</p>
        </div>
      </div>
    </main>
  );
}
