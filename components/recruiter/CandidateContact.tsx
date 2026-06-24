"use client";

// One-click contact actions for a shortlisted candidate: email, call, WhatsApp,
// portfolio/social links, and view/download their resume.

import { Mail, Phone, MessageCircle, Linkedin, Github, Globe, FileText } from "lucide-react";
import { linkKind, phoneDigits } from "@/lib/contact";

export type CandidateContactProps = {
  email?: string | null;
  phone?: string | null;
  links?: string[];
  resumeUrl?: string | null;
  resumeName?: string | null;
};

const chip = "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors";

function LinkIcon({ url }: { url: string }) {
  const k = linkKind(url);
  if (k === "linkedin") return <Linkedin className="w-3.5 h-3.5" />;
  if (k === "github" || k === "gitlab") return <Github className="w-3.5 h-3.5" />;
  return <Globe className="w-3.5 h-3.5" />;
}

function hostLabel(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "link"; }
}

export default function CandidateContact({ email, phone, links = [], resumeUrl, resumeName }: CandidateContactProps) {
  const digits = phone ? phoneDigits(phone) : "";
  const hasAny = email || phone || (links && links.length) || resumeUrl;
  if (!hasAny) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {resumeUrl && (
        <a href={resumeUrl} target="_blank" rel="noopener noreferrer"
          className={`${chip} border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100`}>
          <FileText className="w-3.5 h-3.5" /> {resumeName ? "Resume" : "View resume"}
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} className={`${chip} border-gray-200 text-gray-700 hover:bg-gray-50`}>
          <Mail className="w-3.5 h-3.5" /> {email}
        </a>
      )}
      {phone && (
        <a href={`tel:${phone}`} className={`${chip} border-gray-200 text-gray-700 hover:bg-gray-50`}>
          <Phone className="w-3.5 h-3.5" /> {phone}
        </a>
      )}
      {phone && (
        <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer"
          className={`${chip} border-green-200 bg-green-50 text-green-700 hover:bg-green-100`}>
          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
        </a>
      )}
      {(links || []).map((u) => (
        <a key={u} href={u} target="_blank" rel="noopener noreferrer"
          className={`${chip} border-gray-200 text-gray-700 hover:bg-gray-50`}>
          <LinkIcon url={u} /> {hostLabel(u)}
        </a>
      ))}
    </div>
  );
}
