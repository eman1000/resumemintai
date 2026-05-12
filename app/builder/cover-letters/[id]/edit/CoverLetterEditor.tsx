"use client";

import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGripVertical, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
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
}: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);

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

          <button
            onClick={onDelete}
            className="px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 text-sm"
          >
            Delete
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Form */}
        <div className="space-y-6">
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

        {/* Right - Preview */}
        <div className="hidden lg:block">
          <div className="sticky top-20">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 aspect-[210/297] overflow-hidden">
              <CoverLetterPreview data={data} />
            </div>
          </div>
        </div>
      </div>
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

function CoverLetterPreview({ data }: { data: CoverLetterData }) {
  const fontSize = "text-[10px]";
  return (
    <div className={`${fontSize} text-[#1d1d20] leading-relaxed h-full flex flex-col`}>
      {/* Sender info */}
      <div className="mb-4">
        {data.sender.fullName && <div className="font-bold text-sm">{data.sender.fullName}</div>}
        {data.sender.address && <div>{data.sender.address}</div>}
        {data.sender.city && <div>{data.sender.city}</div>}
        <div className="flex gap-3 mt-1">
          {data.sender.email && <span>{data.sender.email}</span>}
          {data.sender.phone && <span>{data.sender.phone}</span>}
        </div>
      </div>

      {/* Recipient */}
      <div className="mb-3">
        {data.recipient.name && <div>{data.recipient.name}</div>}
        {data.recipient.title && <div>{data.recipient.title}</div>}
        {data.recipient.company && <div className="font-medium">{data.recipient.company}</div>}
        {data.recipient.address && <div>{data.recipient.address}</div>}
        {data.recipient.city && <div>{data.recipient.city}</div>}
      </div>

      {/* Date */}
      {data.date && <div className="mb-3">{data.date}</div>}

      {/* Subject */}
      {data.subject && <div className="font-bold mb-3">{data.subject}</div>}

      {/* Salutation */}
      {data.salutation && <div className="mb-2">{data.salutation}</div>}

      {/* Body paragraphs */}
      <div className="flex-1 space-y-2">
        {data.paragraphs.map((p, i) => (
          <p key={i}>{p || <span className="text-gray-300 italic">Empty paragraph</span>}</p>
        ))}
      </div>

      {/* Closing */}
      <div className="mt-4">
        {data.closing && <div>{data.closing}</div>}
        {data.signatureName && <div className="mt-2 font-medium">{data.signatureName}</div>}
      </div>
    </div>
  );
}
