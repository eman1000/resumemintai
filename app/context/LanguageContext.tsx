// app/context/LanguageContext.tsx
"use client";
import { LanguageCode, tFactory, getMonths, getSkillLevels } from "@/lib/i18n";
import React from "react";

type Ctx = {
  lang: LanguageCode;
  setLang: (l: LanguageCode) => void;
  t: (k: string, fb?: string) => string;
  months: string[];
  skillLevels: string[];
};

const LanguageContext = React.createContext<Ctx | null>(null);

export function LanguageProvider({ initial = "en", children }: { initial?: LanguageCode; children: React.ReactNode }) {
  const [lang, setLang] = React.useState<LanguageCode>(initial);
  const t = React.useMemo(() => tFactory(lang), [lang]);
  const months = React.useMemo(() => getMonths(lang), [lang]);
  const skillLevels = React.useMemo(() => getSkillLevels(lang), [lang]);

  const value = React.useMemo<Ctx>(() => ({ lang, setLang, t, months, skillLevels }), [lang, t, months, skillLevels]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used inside <LanguageProvider>");
  return ctx;
}
