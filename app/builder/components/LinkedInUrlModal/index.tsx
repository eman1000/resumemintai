import React from "react";

/**
 * "Import from LinkedIn" modal. LinkedIn blocks unauthenticated URL scraping
 * (the prior URL-only flow was a no-op against /authwall), so we ask the
 * user to paste the visible profile text instead — that actually works.
 */
const LinkedInUrlModal: React.FC<{
  open: boolean;
  onClose: () => void;
  // Submits the pasted profile text to the API; the parent wires this to
  // /api/import-linkedin with { text }.
  onSubmit: (text: string) => Promise<void>;
}> = ({ open, onClose, onSubmit }) => {
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  if (!open) return null;

  const isValid = text.trim().length >= 200;

  const handleImport = async () => {
    if (!isValid || busy) return;
    setBusy(true);
    try {
      await onSubmit(text.trim());
      onClose();
    } catch (e: any) {
      alert(`Import failed.\n\n${String(e?.message || e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm grid place-items-center px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-xl font-semibold">Import from LinkedIn</h3>
          <button
            aria-label="Close"
            onClick={onClose}
            className="h-9 w-9 grid place-items-center rounded-full border text-gray-600 hover:bg-gray-50"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2.5 text-xs text-blue-900 leading-relaxed">
            <p className="font-semibold mb-1">How to import in 20 seconds:</p>
            <ol className="list-decimal pl-5 space-y-0.5">
              <li>Open your LinkedIn profile in another tab.</li>
              <li>Select everything on the page (<kbd className="px-1 rounded bg-white border">⌘A</kbd> / <kbd className="px-1 rounded bg-white border">Ctrl A</kbd>) and copy (<kbd className="px-1 rounded bg-white border">⌘C</kbd> / <kbd className="px-1 rounded bg-white border">Ctrl C</kbd>).</li>
              <li>Paste it into the box below — our AI will pull out the sections.</li>
            </ol>
            <p className="mt-1 text-[11px] text-blue-800">
              Why not just a URL? LinkedIn blocks bots from reading profile URLs without your sign-in,
              so pasting the text is the only reliable way.
            </p>
          </div>

          <label className="block text-sm font-medium text-gray-800">Paste your LinkedIn profile</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the full text of your LinkedIn profile here…"
            rows={12}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-blue-50/40 focus:bg-white outline-none focus:ring-2 focus:ring-blue-300 leading-relaxed font-mono"
            spellCheck={false}
          />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{text.trim().length} characters</span>
            {text && !isValid && (
              <span className="text-amber-700">Paste a bit more (need at least 200 characters).</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
          <button className="px-4 py-2 rounded-full border hover:bg-gray-50" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`px-5 py-2 rounded-full text-white ${
              isValid ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-300 cursor-not-allowed"
            }`}
            onClick={handleImport}
            disabled={!isValid || busy}
          >
            {busy ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
};
export default LinkedInUrlModal;
