import { auth } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";

export async function getIdTokenOrThrow(): Promise<string> {
  // Already have a user?
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken(/* forceRefresh */ true);
  }
  // Wait for first auth state
  const user = await new Promise<ReturnType<typeof auth.currentUser>>((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      resolve(u);
    });
  });
  if (!user) {
    const err: any = new Error("UNAUTHORIZED");
    err.code = "UNAUTHORIZED";
    throw err;
  }
  return await user.getIdToken(true);
}

/** Attach Authorization: Bearer <token>. Throws if not signed in. */
export async function withAuth(init?: RequestInit): Promise<RequestInit> {
  const token = await getIdTokenOrThrow();
  const headers = new Headers(init?.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
}

/**
 * Attach an auth header when the user is signed in; pass through unchanged
 * for guests. Use for endpoints that accept both anonymous and authed calls
 * (e.g. POST /api/jobs).
 */
export async function withAuthOptional(init?: RequestInit): Promise<RequestInit> {
  if (!auth.currentUser) return init ?? {};
  try {
    const token = await auth.currentUser.getIdToken(true);
    const headers = new Headers(init?.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    return { ...init, headers };
  } catch {
    return init ?? {};
  }
}

/** Fetch with auth and retry once on 401 after forcing a token refresh. */
export async function fetchAuthed(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // First attempt
  let firstInit = await withAuth(init);
  let res = await fetch(input, firstInit);
  if (res.status !== 401) return res;

  // Retry once with a forced refresh
  if (auth.currentUser) {
    const fresh = await auth.currentUser.getIdToken(true);
    const headers = new Headers(firstInit.headers);
    headers.set("Authorization", `Bearer ${fresh}`);
    return fetch(input, { ...firstInit, headers });
  }
  return res;
}
