// lib/schedulers/stripeSyncInit.ts
let started = false;

export function ensureStripeSyncKickoff() {
  if (started) return;
  started = true;

  // fire-and-forget kickoff after cold start
  setTimeout(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/stripe/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": process.env.ADMIN_SYNC_TOKEN!,
      },
      body: JSON.stringify({ all: true })
    }).catch(() => {});
  }, 5000); // small delay so env/DB are ready
}
