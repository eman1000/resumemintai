"use client";

import React from "react";

/** A small chat input for conversational edits ("make it shorter", "remove the
 * PHP skill"). Dumb UI — the parent's onSend does the API call + applies the
 * result, so auth/data handling stays where it already lives. */
export function ChatEditBar({
  onSend,
  placeholder = "Ask AI to change this… e.g. “make it shorter”, “remove the PHP skill”",
  label = "Edit with AI",
}: {
  onSend: (instruction: string) => Promise<void>;
  placeholder?: string;
  label?: string;
}) {
  const [value, setValue] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    const t = value.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      await onSend(t);
      setValue("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
      <div className="text-[11px] font-semibold text-gray-500 px-1 pb-1">✨ {label}</div>
      <div className="flex items-center gap-2">
        <input
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder={placeholder}
          value={value}
          disabled={busy}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || !value.trim()}
          className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Editing…" : "Send"}
        </button>
      </div>
    </div>
  );
}

export default ChatEditBar;
