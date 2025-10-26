// components/MoreMenu.tsx
"use client";
import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisVertical, faPenToSquare, faTrash } from "@fortawesome/free-solid-svg-icons";

export function MoreMenu({
  onRename,
  onDelete,
}: {
  onRename: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button
        className="p-2 rounded-full hover:bg-black/5"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <FontAwesomeIcon icon={faEllipsisVertical} className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-[40]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div className="absolute z-[50] left-0 bottom-0 translate-y-full mt-2 w-40 rounded-xl border bg-white shadow-lg overflow-hidden">
            <button
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                onRename();
              }}
            >
              <FontAwesomeIcon icon={faPenToSquare} className="h-4 w-4" />
              Rename
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-red-600"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                onDelete();
              }}
            >
              <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
