"use client";

// Layout + gate for all recruiter pages. Handles:
//  - auth gating (→ /login?role=recruiter) and recruiter-subscription gating
//    (→ /recruiter/pricing) when `requireSub` is set,
//  - marking the account as a recruiter (one-shot onboard call),
//  - the shared recruiter sub-nav.
// Brand is already blue (#2a72d7); recruiter surfaces lean on a darker navy +
// blue accents to read as the "hiring" side of the product.

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import Logo from "@/components/Logo";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { fetchAuthed } from "@/app/builder/_client/withAuth";

const TABS = [
  { href: "/recruiter/dashboard", label: "Dashboard" },
  { href: "/recruiter/jobs/new", label: "Post a job" },
  { href: "/recruiter/shortlist", label: "Shortlist tool" },
  { href: "/careers", label: "Job board" },
];

export default function RecruiterShell({
  children,
  requireSub = true,
}: {
  children: React.ReactNode;
  requireSub?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isRecruiterSubscribed, loading } = useAuthStatus();
  const [gate, setGate] = React.useState<"checking" | "ok" | "redirecting">("checking");

  React.useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setGate("redirecting");
      const next = encodeURIComponent(pathname || "/recruiter/dashboard");
      router.replace(`/login?role=recruiter&return=${next}`);
      return;
    }
    if (requireSub && !isRecruiterSubscribed) {
      setGate("redirecting");
      router.replace("/recruiter/pricing");
      return;
    }
    setGate("ok");
  }, [loading, isAuthenticated, isRecruiterSubscribed, requireSub, pathname, router]);

  // Mark the account as a recruiter once we know they're signed in (fire & forget).
  React.useEffect(() => {
    if (loading || !isAuthenticated) return;
    fetchAuthed("/api/recruiter/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }).catch(() => {});
  }, [loading, isAuthenticated]);

  if (gate !== "ok") {
    return (
      <div className="fixed inset-0 z-[9999] grid place-items-center bg-white">
        <div className="flex flex-col items-center gap-5">
          <Logo size="xl" />
          <div className="flex items-center gap-2 text-sm text-[#52525a]">
            <div className="h-3.5 w-3.5 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
            Loading your recruiter workspace…
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SiteNav />
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-site mx-auto px-4 flex items-center gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const active = pathname === t.href || (t.href !== "/careers" && pathname?.startsWith(t.href));
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`whitespace-nowrap px-3 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  active
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-[#52525a] hover:text-[#1d1d20]"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
      <main className="min-h-[60vh] bg-[#f8fbfc]">{children}</main>
    </>
  );
}
