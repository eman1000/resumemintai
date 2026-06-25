"use client";

// Admin gate + chrome. Calls /api/admin/me; non-admins are bounced home. Real
// protection is server-side on every /api/admin/* route — this is just UX.

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { fetchAuthed } from "@/app/builder/_client/withAuth";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = React.useState<"checking" | "ok" | "denied">("checking");
  const [email, setEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchAuthed("/api/admin/me")
      .then((r) => r.json())
      .then((j) => {
        if (j?.isAdmin) { setEmail(j.email || null); setState("ok"); }
        else { setState("denied"); router.replace("/"); }
      })
      .catch(() => { setState("denied"); router.replace("/"); });
  }, [router]);

  if (state !== "ok") {
    return (
      <div className="min-h-screen grid place-items-center bg-[#0f1b2d] text-gray-300 text-sm">
        {state === "checking" ? "Verifying admin access…" : "Not authorized."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fbfc]">
      <header className="bg-[#0f1b2d] text-white">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-bold tracking-tight">ResumeMint <span className="text-mint-400">Admin</span></span>
            <nav className="flex items-center gap-1 text-sm">
              {TABS.map((t) => {
                const active = pathname === t.href || (t.href !== "/admin" && pathname?.startsWith(t.href));
                return (
                  <Link key={t.href} href={t.href}
                    className={`px-3 py-1.5 rounded-md transition-colors ${active ? "bg-white/15 text-white" : "text-gray-300 hover:text-white"}`}>
                    {t.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="hidden sm:inline">{email}</span>
            <Link href="/" className="hover:text-white">← App</Link>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
