"use client";

// Recruiter pricing + checkout. Single plan ($49/mo, 14-day trial). If the user
// already has an active recruiter subscription, bounce them into the dashboard.

import React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import SocialProof from "@/components/SocialProof";
import RecruiterCheckout from "@/components/recruiter/RecruiterCheckout";
import { useAuthStatus } from "@/hooks/useAuthStatus";

const FEATURES = [
  "AI candidate shortlisting (up to 50 resumes/run)",
  "100 shortlisting runs per month",
  "Post unlimited jobs to the public board",
  "End-to-end internal applications",
  "AI-rank your applicants with evidence + gaps",
  "Honest, resume-grounded scoring",
  "Cancel anytime",
];

export default function RecruiterPricingPage() {
  const router = useRouter();
  const { isRecruiterSubscribed, loading } = useAuthStatus();

  React.useEffect(() => {
    if (!loading && isRecruiterSubscribed) router.replace("/recruiter/dashboard");
  }, [loading, isRecruiterSubscribed, router]);

  return (
    <>
      <SiteNav />
      <main className="max-w-site mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase text-mint-700 bg-mint-50 rounded-full px-3 py-1">
            For recruiters
          </span>
          <h1 className="mt-4 text-4xl font-bold text-[#1d1d20]">Recruiter plan</h1>
          <p className="mt-3 text-[#52525a]">Everything you need to shortlist and hire — one simple plan.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">
          {/* Plan card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-[#1d1d20]">$49</div>
              <div className="text-[#52525a] mt-1">/month</div>
              <div className="text-sm text-[#a1a1aa] mt-1">14-day free trial · cancel anytime</div>
            </div>
            <ul className="mt-8 space-y-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-[#1d1d20]">
                  <Check className="w-5 h-5 text-mint-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Checkout */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-8">
            <h2 className="font-semibold text-[#1d1d20] mb-4">Start your free trial</h2>
            <RecruiterCheckout />
          </div>
        </div>
      </main>
      <SiteFooter />
      <SocialProof variant="recruiter" />
    </>
  );
}
