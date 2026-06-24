"use client";

// The ad-hoc shortlist tool now lives in a modal on the Shortlists page.
// This route just redirects there and opens the modal (?new=1).

import React from "react";
import { useRouter } from "next/navigation";

export default function ShortlistRedirect() {
  const router = useRouter();
  React.useEffect(() => {
    router.replace("/recruiter/shortlists?new=1");
  }, [router]);
  return (
    <div className="min-h-[40vh] grid place-items-center text-sm text-[#52525a]">Opening shortlist tool…</div>
  );
}
