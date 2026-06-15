"use client";

import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGripVertical,
  faPlus,
  faTrash,
  faWandMagicSparkles,
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import toast from "react-hot-toast";
import { withAuth } from "@/app/builder/_client/withAuth";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import SubscribeSlidePanel from "@/components/SubscribeSlidePanel";
import LoginSlidePanel from "@/components/LoginSlidePanel";
import {
  COVER_LETTER_TEMPLATES,
  getCoverLetterTemplate,
} from "@/components/cover-letter-templates";
import {
  captureHtmlThumbnailFromPreview,
  uploadCoverLetterThumbnail,
} from "@/app/builder/_client/captureHtmlThumbnail";
import { useParams } from "next/navigation";
import type { CoverLetterData } from "./page";

interface Props {
  title: string;
  renderer: string;
  data: CoverLetterData;
  language: string;
  savingState: "idle" | "saving" | "saved" | "error";
  onTitleChange: (t: string) => void;
  onRendererChange: (r: string) => void;
  onDataChange: (d: CoverLetterData) => void;
  onDelete: () => void;
  onDownload?: () => void;
}

export default function CoverLetterEditor({
  title,
  renderer,
  data,
  language,
  savingState,
  onTitleChange,
  onRendererChange,
  onDataChange,
  onDelete,
  onDownload,
}: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const params = useParams();
  const coverLetterId = (params?.id as string) || "";

  // Thumbnail capture throttle — matches the resume builder's 20s cadence.
  const previewRef = React.useRef<HTMLDivElement>(null);
  const lastThumbUpload = React.useRef<number>(0);
  React.useEffect(() => {
    if (!coverLetterId) return;
    const now = Date.now();
    if (now - lastThumbUpload.current < 20_000) return;
    const handle = setTimeout(async () => {
      const el = previewRef.current;
      if (!el) return;
      const blob = await captureHtmlThumbnailFromPreview(el, {
        scale: 2,
        background: "#ffffff",
      });
      if (!blob) return;
      try {
        await uploadCoverLetterThumbnail(coverLetterId, blob, withAuth);
        lastThumbUpload.current = Date.now();
      } catch (e: any) {
        const reason = e?.message || String(e);
        console.warn("[cl-thumbnail-upload] failed:", reason);
        try {
          if (typeof window !== 'undefined' && !(window as any).__rmThumbToasted) {
            (window as any).__rmThumbToasted = true;
            toast.error(`Couldn't save preview thumbnail: ${reason.slice(0, 140)}`);
          }
        } catch {}
      }
    }, 1500); // small debounce so we don't fire mid-typing
    return () => clearTimeout(handle);
    // Re-run whenever the visible content changes
  }, [coverLetterId, data, renderer]);

  const { isAuthenticated, isSubscribed } = useAuthStatus();
  const [loginOpen, setLoginOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [pendingProAfterLogin, setPendingProAfterLogin] = useState(false);

  // After successful login, chain into the subscribe panel if the user was
  // trying to access a PRO template.
  React.useEffect(() => {
    if (!pendingProAfterLogin) return;
    if (!isAuthenticated) return;
    setPendingProAfterLogin(false);
    if (!isSubscribed) setSubscribeOpen(true);
  }, [pendingProAfterLogin, isAuthenticated, isSubscribed]);

  React.useEffect(() => setLocalTitle(title), [title]);

  const update = (partial: Partial<CoverLetterData>) => {
    onDataChange({ ...data, ...partial });
  };

  const updateSender = (partial: Partial<CoverLetterData["sender"]>) => {
    onDataChange({ ...data, sender: { ...data.sender, ...partial } });
  };

  const updateRecipient = (partial: Partial<CoverLetterData["recipient"]>) => {
    onDataChange({ ...data, recipient: { ...data.recipient, ...partial } });
  };

  const updateParagraph = (idx: number, value: string) => {
    const next = [...data.paragraphs];
    next[idx] = value;
    onDataChange({ ...data, paragraphs: next });
  };

  const addParagraph = () => {
    onDataChange({ ...data, paragraphs: [...data.paragraphs, ""] });
  };

  const removeParagraph = (idx: number) => {
    if (data.paragraphs.length <= 1) return;
    const next = data.paragraphs.filter((_, i) => i !== idx);
    onDataChange({ ...data, paragraphs: next });
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const next = [...data.paragraphs];
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    onDataChange({ ...data, paragraphs: next });
  };

  /* ---------------- Template selection (with PRO gate) ---------------- */
  const selectTemplate = (tplId: string, isFree: boolean) => {
    if (!isFree && !isSubscribed) {
      if (!isAuthenticated) {
        setPendingProAfterLogin(true);
        setLoginOpen(true);
      } else {
        setSubscribeOpen(true);
      }
      return;
    }
    onRendererChange(tplId);
  };

  /* ---------------- AI JD tailor ---------------- */
  const [jdOpen, setJdOpen] = useState(false);
  const [jdText, setJdText] = useState("");
  const [jdUrl, setJdUrl] = useState("");
  const [tailoring, setTailoring] = useState(false);

  const handleTailor = async () => {
    const text = jdText.trim();
    const url = jdUrl.trim();
    if (!text && !url) {
      toast.error("Paste the job description or its URL");
      return;
    }
    setTailoring(true);
    try {
      const res = await fetch(
        "/api/assist/cover-letter-tailor",
        await withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data,
            jdText: text || undefined,
            jdUrl: url || undefined,
          }),
        })
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j?.detail || j?.error || "tailor_failed");
      const next: CoverLetterData = {
        ...data,
        subject: j.subject || data.subject,
        paragraphs:
          Array.isArray(j.paragraphs) && j.paragraphs.length > 0
            ? j.paragraphs
            : data.paragraphs,
      };
      onDataChange(next);
      toast.success("Tailored to the job");
      setJdOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Couldn’t tailor — try again");
    } finally {
      setTailoring(false);
    }
  };

  const Template = getCoverLetterTemplate(renderer);

  return (
    <div className="min-h-screen bg-[#f8fbfc]">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto h-14 px-4 flex items-center gap-2">
          <button
            className="mr-1 rounded-full p-2 text-[#52525a] hover:bg-gray-100"
            onClick={() => history.back()}
            title="Back"
          >
            <span className="text-xl">←</span>
          </button>

          <div className="flex-1 min-w-0 flex items-center">
            {editingTitle ? (
              <input
                autoFocus
                className="w-full bg-transparent outline-none border-b border-brand text-xl font-semibold text-[#1d1d20]"
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={() => {
                  setEditingTitle(false);
                  if (localTitle.trim() && localTitle !== title) onTitleChange(localTitle.trim());
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { setEditingTitle(false); if (localTitle.trim()) onTitleChange(localTitle.trim()); }
                  if (e.key === "Escape") { setEditingTitle(false); setLocalTitle(title); }
                }}
              />
            ) : (
              <button
                className="text-left truncate text-xl font-semibold text-[#1d1d20] hover:underline decoration-brand"
                onClick={() => setEditingTitle(true)}
              >
                {title || "Untitled Cover Letter"}
              </button>
            )}
            <div className="ml-2 text-xs text-[#a1a1aa]">
              {savingState === "saving" ? "Saving…" : savingState === "saved" ? "Saved" : ""}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDownload && (
              <button
                onClick={onDownload}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium"
              >
                Download
              </button>
            )}
            <button
              onClick={onDelete}
              className="px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Form */}
        <div className="space-y-5">
          {/* AI Tailor panel */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="w-4 h-4 text-brand" />
                <h2 className="font-semibold text-[#1d1d20]">Tailor to a job (AI)</h2>
              </div>
              <button
                onClick={() => setJdOpen((v) => !v)}
                className="text-xs text-brand hover:underline"
              >
                {jdOpen ? "Hide" : "Open"}
              </button>
            </div>
            <p className="mt-1 text-xs text-[#52525a]">
              Paste a job description or URL. We&rsquo;ll rewrite the subject + paragraphs around it.
            </p>
            {jdOpen && (
              <div className="mt-4 space-y-3">
                <textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  rows={6}
                  placeholder="Paste the job description here…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#1d1d20] focus:border-brand focus:ring-1 focus:ring-brand outline-none resize-y"
                />
                <div className="flex items-center gap-2 text-xs text-[#a1a1aa]">
                  <span className="h-px flex-1 bg-gray-200" />
                  <span>or</span>
                  <span className="h-px flex-1 bg-gray-200" />
                </div>
                <input
                  type="url"
                  value={jdUrl}
                  onChange={(e) => setJdUrl(e.target.value)}
                  placeholder="Job listing URL"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#1d1d20] focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleTailor}
                    disabled={tailoring || (!jdText.trim() && !jdUrl.trim())}
                    className="rounded-lg bg-brand text-white text-sm px-3 py-2 font-medium disabled:opacity-60"
                  >
                    {tailoring ? "Tailoring…" : "✨ Tailor with AI"}
                  </button>
                  <button
                    onClick={() => {
                      if (!navigator.clipboard) return;
                      navigator.clipboard.readText().then((t) => setJdText(t || "")).catch(() => {});
                    }}
                    className="rounded-lg border border-gray-300 text-sm px-3 py-2 hover:bg-gray-50"
                  >
                    Paste
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sender */}
          <Section title="Your Details">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name" value={data.sender.fullName} onChange={(v) => updateSender({ fullName: v })} className="col-span-2" />
              <Field label="Email" value={data.sender.email} onChange={(v) => updateSender({ email: v })} />
              <Field label="Phone" value={data.sender.phone} onChange={(v) => updateSender({ phone: v })} />
              <Field label="Address" value={data.sender.address} onChange={(v) => updateSender({ address: v })} />
              <Field label="City" value={data.sender.city} onChange={(v) => updateSender({ city: v })} />
            </div>
          </Section>

          {/* Recipient */}
          <Section title="Recipient">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name" value={data.recipient.name} onChange={(v) => updateRecipient({ name: v })} />
              <Field label="Title" value={data.recipient.title} onChange={(v) => updateRecipient({ title: v })} />
              <Field label="Company" value={data.recipient.company} onChange={(v) => updateRecipient({ company: v })} className="col-span-2" />
              <Field label="Address" value={data.recipient.address} onChange={(v) => updateRecipient({ address: v })} />
              <Field label="City" value={data.recipient.city} onChange={(v) => updateRecipient({ city: v })} />
            </div>
          </Section>

          {/* Letter Details */}
          <Section title="Letter Details">
            <div className="space-y-3">
              <Field label="Date" value={data.date} onChange={(v) => update({ date: v })} />
              <Field label="Subject" value={data.subject} onChange={(v) => update({ subject: v })} placeholder="e.g. Application for Software Engineer" />
              <Field label="Salutation" value={data.salutation} onChange={(v) => update({ salutation: v })} />
            </div>
          </Section>

          {/* Paragraphs */}
          <Section title="Letter Body">
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="paragraphs">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                    {data.paragraphs.map((p, idx) => (
                      <Draggable key={idx} draggableId={`para-${idx}`} index={idx}>
                        {(prov) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            className="flex gap-2 items-start"
                          >
                            <div {...prov.dragHandleProps} className="pt-3 text-[#a1a1aa] cursor-grab">
                              <FontAwesomeIcon icon={faGripVertical} className="w-3 h-3" />
                            </div>
                            <textarea
                              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#1d1d20] focus:border-brand focus:ring-1 focus:ring-brand outline-none resize-y min-h-[80px]"
                              value={p}
                              onChange={(e) => updateParagraph(idx, e.target.value)}
                              placeholder={`Paragraph ${idx + 1}`}
                              rows={3}
                            />
                            {data.paragraphs.length > 1 && (
                              <button
                                className="pt-3 text-[#a1a1aa] hover:text-red-600"
                                onClick={() => removeParagraph(idx)}
                                title="Remove paragraph"
                              >
                                <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            <button
              className="mt-3 inline-flex items-center gap-2 text-sm text-brand hover:underline"
              onClick={addParagraph}
            >
              <FontAwesomeIcon icon={faPlus} className="w-3 h-3" />
              Add paragraph
            </button>
          </Section>

          {/* Closing */}
          <Section title="Closing">
            <div className="space-y-3">
              <Field label="Closing" value={data.closing} onChange={(v) => update({ closing: v })} />
              <Field label="Signature Name" value={data.signatureName} onChange={(v) => update({ signatureName: v })} />
            </div>
          </Section>
        </div>

        {/* Right - Preview + Templates */}
        <div className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            {/* A4-ish preview at scale */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden aspect-[210/297]">
              <div ref={previewRef} className="h-full w-full overflow-hidden">
                <Template data={data} />
              </div>
            </div>

            {/* Template picker */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#1d1d20]">Template</h3>
                <span className="text-xs text-[#a1a1aa]">
                  {COVER_LETTER_TEMPLATES.length} designs
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {COVER_LETTER_TEMPLATES.map((t) => {
                  const isActive = renderer === t.id;
                  const locked = !t.isFree && !isSubscribed;
                  const PreviewTpl = getCoverLetterTemplate(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => selectTemplate(t.id, t.isFree)}
                      className={[
                        "group relative rounded-lg border p-2 text-left transition-all",
                        isActive
                          ? "border-brand ring-2 ring-brand/30 bg-brand/5"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                      ].join(" ")}
                    >
                      {/* Live mini-render of the template using the user's
                          actual data — scaled to fit the thumbnail box so
                          users see exactly what they'd get. */}
                      <div
                        className={[
                          "relative aspect-[3/4] w-full rounded-md overflow-hidden mb-2 bg-white border border-gray-200",
                          locked ? "opacity-90" : "",
                        ].join(" ")}
                      >
                        <div
                          aria-hidden="true"
                          style={{
                            width: 595,           // template native A4-ish width
                            height: 842,
                            transformOrigin: "top left",
                            transform: "scale(0.22)",
                            pointerEvents: "none",
                            position: "absolute",
                            top: 0,
                            left: 0,
                          }}
                        >
                          <PreviewTpl data={data} preview />
                        </div>
                        {locked && (
                          <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] grid place-items-center">
                            <span className="rounded-full bg-amber-500/95 text-white text-[10px] font-semibold px-2 py-0.5 inline-flex items-center gap-1">
                              <FontAwesomeIcon icon={faLock} className="w-2 h-2" />
                              PRO
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-medium truncate">{t.name}</span>
                        {!t.isFree && !locked && (
                          <span className="text-[9px] rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 font-medium">
                            PRO
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] text-[#a1a1aa] line-clamp-2">{t.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Login / Subscribe panels for PRO gating */}
      <LoginSlidePanel
        open={loginOpen}
        onClose={() => { setLoginOpen(false); setPendingProAfterLogin(false); }}
        onSuccess={() => setLoginOpen(false)}
        reason={pendingProAfterLogin ? "Sign in to unlock premium templates." : undefined}
      />
      <SubscribeSlidePanel open={subscribeOpen} onClose={() => setSubscribeOpen(false)} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h2 className="font-semibold text-[#1d1d20] mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-[#52525a] mb-1">{label}</label>
      <input
        type="text"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#1d1d20] focus:border-brand focus:ring-1 focus:ring-brand outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
      />
    </div>
  );
}
