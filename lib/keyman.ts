// lib/keyman.ts
'use client';

let _keymanId: string | null = null;
const KEY = 'keyman_id';

export function createKeymanId() {
  const raw =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return raw.replace(/-/g, '');
}

export function seedKeymanId(id: string) {
  _keymanId = id;
  try { sessionStorage.setItem(KEY, id); } catch {}
  try { localStorage.setItem(KEY, id); } catch {}
  return id;
}

/** Read ?km=... and seed it if present; otherwise return persisted/generated value. */
export function getKeymanIdPreferUrl(): string | null {
  if (typeof window === 'undefined') return null;

  // 1) Prefer URL override (?km=)
  try {
    const u = new URL(window.location.href);
    const km = u.searchParams.get('km');
    if (km && km.length >= 8) return seedKeymanId(km);
  } catch {}

  // 2) Then sessionStorage
  try {
    const s = sessionStorage.getItem(KEY);
    if (s) return (_keymanId = s);
  } catch {}

  // 3) Then localStorage (and rehydrate session)
  try {
    const l = localStorage.getItem(KEY);
    if (l) {
      try { sessionStorage.setItem(KEY, l); } catch {}
      return (_keymanId = l);
  } } catch {}

  // 4) Finally generate new
  return seedKeymanId(createKeymanId());
}
