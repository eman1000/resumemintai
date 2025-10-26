// hooks/useResumeActions.ts
"use client";
import * as React from "react";
import toast from "react-hot-toast";

export type ResumeLite = { id: string; title?: string };

type Options = {
  withAuth: (init?: RequestInit) => Promise<RequestInit>;
  onRenamed?: (id: string, newTitle: string) => void;   // e.g. update local state
  onDeleted?: (id: string) => void;                     // e.g. remove from list / navigate away
  getTitle?: (id: string) => string | undefined;        // optional: supply current title for dialogs
};

export function useResumeActions({ withAuth, onRenamed, onDeleted, getTitle }: Options) {
  const rename = React.useCallback(
    async (resume: ResumeLite, nextTitle: string) => {
      if (!nextTitle || nextTitle === resume.title) return;
      const run = async () => {
        const res = await fetch(
          `/api/resumes/${resume.id}`,
          await withAuth({
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: nextTitle }),
          })
        );
        if (!res.ok) throw new Error(await res.text().catch(() => "Rename failed"));
        onRenamed?.(resume.id, nextTitle);
      };
      await toast.promise(run(), {
        loading: "Renaming…",
        success: "Title updated",
        error: (e) => (e as Error).message || "Couldn't rename",
      });
    },
    [withAuth, onRenamed]
  );

  const remove = React.useCallback(
    async (resume: ResumeLite) => {
      const run = async () => {
        const res = await fetch(
          `/api/resumes/${resume.id}`,
          await withAuth({ method: "DELETE" })
        );
        if (!res.ok) throw new Error(await res.text().catch(() => "Delete failed"));
        onDeleted?.(resume.id);
      };
      await toast.promise(run(), {
        loading: "Deleting…",
        success: "Resume deleted",
        error: (e) => (e as Error).message || "Couldn't delete",
      });
    },
    [withAuth, onDeleted]
  );

  return {
    rename,
    remove,
    getInitialTitle: (r: ResumeLite) => r.title ?? getTitle?.(r.id) ?? "Untitled CV",
  };
}
