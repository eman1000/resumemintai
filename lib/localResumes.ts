// Anonymous visitors build into localStorage (`resume:local-<uuid>`), because the
// builder is free and sign-up only happens at download. Nothing used to move that
// work into the account, so a guest who built a CV and then signed up saw an empty
// dashboard and lost their CV on any other device — at the exact moment they were
// being asked to pay.
//
// These helpers adopt local resumes into the signed-in account.
import { auth } from '@/app/firebase';

const PREFIX = 'resume:local-';

type LocalResume = { title?: string; renderer?: string; data?: unknown };

function listLocalKeys(): string[] {
  try {
    return Object.keys(window.localStorage).filter((k) => k.startsWith(PREFIX));
  } catch {
    return [];
  }
}

async function authedFetch(input: string, init: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('not_signed_in');
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(input, { ...init, headers });
}

/**
 * Save every local resume into the signed-in account and clear the local copies.
 * Returns a map of localId -> new server id so a caller can redirect.
 * Never throws: a failed adoption leaves the local copy in place.
 */
export async function adoptLocalResumes(): Promise<Record<string, string>> {
  const moved: Record<string, string> = {};
  if (typeof window === 'undefined' || !auth.currentUser) return moved;

  for (const key of listLocalKeys()) {
    const localId = key.slice('resume:'.length);
    let parsed: LocalResume;
    try {
      parsed = JSON.parse(window.localStorage.getItem(key) || '{}');
    } catch {
      continue;
    }
    try {
      const res = await authedFetch('/api/resumes', {
        method: 'POST',
        body: JSON.stringify({
          title: parsed.title || 'Untitled CV',
          renderer: parsed.renderer || 'professional',
          data: parsed.data ?? { id: 'local', sections: [] },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.id) continue;
      moved[localId] = String(json.id);
      try { window.localStorage.removeItem(key); } catch { /* ignore */ }
    } catch {
      // Keep the local copy so the work is never lost.
    }
  }
  return moved;
}
