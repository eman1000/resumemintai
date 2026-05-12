"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { withAuth } from "@/app/builder/_client/withAuth";
import toast from "react-hot-toast";
import AuthGate from "@/components/AuthGate";
import CoverLetterEditor from "./CoverLetterEditor";

export interface CoverLetterData {
  id: string;
  sender: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    linkedIn?: string;
  };
  recipient: {
    name: string;
    title: string;
    company: string;
    address: string;
    city: string;
  };
  date: string;
  subject: string;
  salutation: string;
  paragraphs: string[];
  closing: string;
  signatureName: string;
}

const DEFAULT_DATA: CoverLetterData = {
  id: "local",
  sender: { fullName: "", email: "", phone: "", address: "", city: "" },
  recipient: { name: "", title: "", company: "", address: "", city: "" },
  date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
  subject: "",
  salutation: "Dear Hiring Manager,",
  paragraphs: [
    "I am writing to express my interest in the position at your company.",
    "With my experience and skills, I believe I would be a valuable addition to your team.",
    "I look forward to the opportunity to discuss how I can contribute to your organization.",
  ],
  closing: "Sincerely,",
  signatureName: "",
};

export default function CoverLetterEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [title, setTitle] = useState("Untitled Cover Letter");
  const [renderer, setRenderer] = useState("professional");
  const [data, setData] = useState<CoverLetterData>(DEFAULT_DATA);
  const [language, setLanguage] = useState("en-UK");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load cover letter
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/cover-letters/${id}`, await withAuth());
        if (!res.ok) throw new Error("not found");
        const json = await res.json();
        setTitle(json.title || "Untitled Cover Letter");
        setRenderer(json.renderer || "professional");
        setData(json.data || DEFAULT_DATA);
        setLanguage(json.language || "en-UK");
        setLoaded(true);
      } catch {
        toast.error("Cover letter not found");
        router.push("/builder/cover-letters");
      }
    })();
  }, [id, router]);

  // Autosave
  const save = useCallback(
    async (nextData: CoverLetterData, nextTitle?: string) => {
      setSaving("saving");
      try {
        const body: any = { data: nextData };
        if (nextTitle !== undefined) body.title = nextTitle;
        const res = await fetch(
          `/api/cover-letters/${id}`,
          await withAuth({
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        );
        if (!res.ok) throw new Error("save failed");
        setSaving("saved");
      } catch {
        setSaving("error");
      }
    },
    [id]
  );

  const debouncedSave = useCallback(
    (nextData: CoverLetterData, nextTitle?: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => save(nextData, nextTitle), 1200);
    },
    [save]
  );

  const handleDataChange = useCallback(
    (nextData: CoverLetterData) => {
      setData(nextData);
      debouncedSave(nextData);
    },
    [debouncedSave]
  );

  const handleTitleChange = useCallback(
    (nextTitle: string) => {
      setTitle(nextTitle);
      debouncedSave(data, nextTitle);
    },
    [data, debouncedSave]
  );

  if (!loaded) {
    return (
      <AuthGate>
        <div className="min-h-screen bg-[#f8fbfc] flex items-center justify-center">
          <p className="text-[#a1a1aa] text-sm">Loading cover letter…</p>
        </div>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <CoverLetterEditor
        title={title}
        renderer={renderer}
        data={data}
        language={language}
        savingState={saving}
        onTitleChange={handleTitleChange}
        onRendererChange={setRenderer}
        onDataChange={handleDataChange}
        onDelete={async () => {
          try {
            await fetch(`/api/cover-letters/${id}`, await withAuth({ method: "DELETE" }));
            toast.success("Deleted");
            router.push("/builder/cover-letters");
          } catch {
            toast.error("Delete failed");
          }
        }}
      />
    </AuthGate>
  );
}
