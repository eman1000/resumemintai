function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/30">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-xl bg-white shadow-xl p-5"
      >
        <h3 className="text-lg font-semibold text-black">{title}</h3>
        {description ? (
          <p className="mt-2 text-sm text-gray-600">{description}</p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="px-3 py-1.5 text-black rounded-lg border hover:bg-gray-50"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
