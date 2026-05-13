import React from "react";

function RenameDialog({
  open,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial: string;
  onClose: () => void;
  onSubmit: (nextTitle: string) => void;
}) {
  const [val, setVal] = React.useState(initial || "");

  React.useEffect(() => {
    if (open) setVal(initial || "");
  }, [open, initial]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/30">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-5">
        <h3 className="text-lg font-semibold text-black">Rename resume</h3>
        <div className="mt-3">
          <input
            autoFocus
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-[#1d1d20] focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="Untitled CV"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit(val.trim());
            }}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="px-3 py-1.5 rounded-lg border hover:bg-gray-50 text-black" onClick={onClose}>
            Cancel
          </button>
          <button
            className="px-3 py-1.5 rounded-lg bg-brand text-white hover:bg-brand-700 disabled:opacity-60"
            onClick={() => onSubmit(val.trim())}
            disabled={!val.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default RenameDialog;