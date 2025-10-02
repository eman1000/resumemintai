export function scoreATS(resume: { skills: { core: string[]; tools: string[]; soft: string[] }, experience: { bullets: string[] }[] }, jd: string) {
  const text = jd.toLowerCase();
  const tokens = new Set<string>();
  const add = (arr: string[]) => arr.forEach(s => tokens.add(s.toLowerCase().trim()));
  add(resume.skills.core); add(resume.skills.tools); add(resume.skills.soft);
  // naive extraction from bullets
  resume.experience.forEach(j => j.bullets.forEach(b => b.split(/[,;/]/).forEach(w => tokens.add(w.toLowerCase().trim()))));

  const matched = Array.from(tokens).filter(k => k && text.includes(k));
  const score = Math.round((matched.length / Math.max(1, tokens.size)) * 100);
  return { score, matched };
}
