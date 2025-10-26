import React from "react";

/* LinkedIn URL Modal */
const LinkedInUrlModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSubmit: (url: string) => Promise<void>;
}> = ({ open, onClose, onSubmit }) => {
  const [url, setUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  if (!open) return null;

  const isValid = /^https?:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]+\/?$/.test(url.trim());

  const handleImport = async () => {
    if (!isValid || busy) return;
    setBusy(true);
    try {
      await onSubmit(url.trim());
      onClose();
    } catch (e: any) {
      alert(`Import failed.\n\n${String(e?.message || e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm grid place-items-center px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-xl font-semibold">Import LinkedIn profile</h3>
          <button
            aria-label="Close"
            onClick={onClose}
            className="h-9 w-9 grid place-items-center rounded-full border text-gray-600 hover:bg-gray-50"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-2">
          <label className="block text-sm text-gray-700 mb-1">Your LinkedIn profile URL</label>
          <input
            className="w-full rounded-lg border px-3 py-3 text-base bg-blue-50/50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="https://www.linkedin.com/in/username"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          {!url || isValid ? null : (
            <p className="text-xs text-red-600 mt-1">Enter a valid LinkedIn /in/ URL.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
          <button className="px-4 py-2 rounded-full border hover:bg-gray-50" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`px-5 py-2 rounded-full text-white ${isValid ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-300 cursor-not-allowed"}`}
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