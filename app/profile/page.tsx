"use client";

// /profile — your Master Resume (single source of truth).
//
// Resolves the user's master resume and opens it in the builder. Tailoring
// derives non-destructive copies from this; edits here are the canonical ones.
// If the user has no resume yet, sends them to create/import one.

import React from "react";
import { useRouter } from "next/navigation";
import { fetchAuthed } from "@/app/builder/_client/withAuth";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import FullscreenLoader from "@/app/builder/components/FullscreenLoader";

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuthStatus();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      // Builder home handles sign-in prompting + resume list.
      router.replace("/builder");
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await fetchAuthed("/api/resume/master");
        if (!res.ok) throw new Error(String(res.status));
        const { id } = await res.json();
        if (!alive) return;
        if (id) router.replace(`/builder/${id}/edit`);
        else router.replace("/builder"); // no resume yet → create/import one
      } catch {
        if (alive) setError("Couldn't open your profile. Please try again.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [loading, isAuthenticated, router]);

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-white p-6 text-center">
        <div>
          <p className="text-gray-800 mb-3">{error}</p>
          <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={() => router.push("/builder")}>
            Go to my resumes
          </button>
        </div>
      </div>
    );
  }

  return <FullscreenLoader label="Opening your profile…" />;
}
