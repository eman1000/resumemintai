// lib/normalize.ts
import { EMPTY, ResumeData } from './schema';

const isHex = (s?: string) => typeof s === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s);

export function normalize(out: any): ResumeData {
  const safe = { ...EMPTY, ...(out || {}) } as ResumeData;

  const fixStr = (s?: any) => (typeof s === 'string' ? s.trim() : '');
  const fixArr = (a?: any) => (Array.isArray(a) ? a.filter(Boolean) : []);
  const toStrs = (a: any) =>
    fixArr(a)
      .map((v: any) => (typeof v === 'string' ? v : v?.value ?? v?.name ?? v?.label ?? String(v)))
      .map((s) => String(s).trim())
      .filter(Boolean);

  // header-ish
  safe.name = fixStr(safe.name);
  safe.summary = fixStr(safe.summary);

  // skills
  safe.skills = {
    core: toStrs(safe.skills?.core),
    tools: toStrs(safe.skills?.tools),
    soft:  toStrs(safe.skills?.soft),
  };

  // experience
  safe.experience = fixArr(safe.experience).map((e: any) => ({
    role: fixStr(e.role),
    company: fixStr(e.company),
    location: fixStr(e.location),
    start: fixStr(e.start),
    end: fixStr(e.end),
    bullets: toStrs(e.bullets),
  }));

  // education
  safe.education = fixArr(safe.education).map((e: any) => ({
    degree: fixStr(e.degree),
    school: fixStr(e.school),
    location: fixStr(e.location),
    dates: fixStr(e.dates),
    notes: toStrs(e.notes),
  }));

  // achievements
  safe.achievements = toStrs(safe.achievements);

  // NEW: languages
  safe.languages = toStrs(safe.languages);

  // NEW: references
  safe.references = fixArr(safe.references).map((r: any) => ({
    name: fixStr(r.name),
    title: fixStr(r.title),
    company: fixStr(r.company),
    phone: fixStr(r.phone),
    email: fixStr(r.email),
  })).filter((r: any) => r.name);

  // NEW: theme colors with safe fallbacks
  const sb = safe.theme?.sidebar;
  const ac = safe.theme?.accent;
  safe.theme = {
    sidebar: isHex(sb) ? sb! : '#1f3140',
    accent:  isHex(ac) ? ac! : '#2a5b78',
  };

  return safe;
}
