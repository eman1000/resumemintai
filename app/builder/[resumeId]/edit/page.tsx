"use client";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import isEqual from "fast-deep-equal";
import toast from "react-hot-toast";

import BuilderEditor from "./runtime/BuilderEditor";
import TopBar, { SavingState } from "@/app/builder/components/TopBar";
import { useAutosave } from "@/app/api/resumes/hooks/useAutosave";
import { captureThumbnailFromPreview, uploadThumbnail } from "../../_client/captureThumbnail";
import { exportSvgContainerToPdf } from "../../components/A4Preview/exportSvgPdf";
import ConfirmDialog from "@/components/ConfirmDialog";
import RenameDialog from "@/components/RenameDialog";
import { useResumeActions } from "@/app/builder/hooks/useResumeActions";
import { withAuth } from "../../_client/withAuth";
import { LanguageProvider, useI18n } from "@/app/context/LanguageContext";
import { LanguageCode, localizeDocTitles } from "@/lib/i18n";

type LoadedResume = {
  id?: string;
  title: string;
  renderer: string;
  data?: any;
  language?: string; 
};


// EditPageWithProvider
export default function EditPageWithProvider() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const [bootLang, setBootLang] = React.useState<LanguageCode | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/resumes/${resumeId}`, await withAuth());
        const j = await r.json().catch(() => ({}));
        console.log("Boot language:", j?.language);
        setBootLang((j?.language as LanguageCode) || "en"); // or fallback you prefer
      } catch {
        setBootLang("en");
      }
    })();
  }, [resumeId]);

  if (!bootLang) return null; // small skeleton if you want

  return (
    <LanguageProvider initial={bootLang}>
      <EditPageInner />
    </LanguageProvider>
  );
}


function EditPageInner() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const router = useRouter();

  const [loaded, setLoaded] = React.useState<LoadedResume | null>(null);
  const [title, setTitle] = React.useState<string>("Untitled CV");
  const [renderer, setRenderer] = React.useState<LoadedResume["renderer"]>("professional");
  const [data, setData] = React.useState<any>({ id: "local", sections: [] });

  const [language, setLanguage] = React.useState<any>("en-UK");

  const [savingState, setSavingState] = React.useState<SavingState>("idle");
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const wrapRef = React.useRef<HTMLDivElement>(null);
  const lastThumbUpload = React.useRef<number>(0);

  const [dateFormat, setDateFormat] = React.useState<"MMM YYYY" | "MM/YYYY">("MMM YYYY");
  const { lang, setLang, t, months, skillLevels } = useI18n();
  const prevLangRef = React.useRef<LanguageCode>(lang);

  // when language changes: relabel default section titles (non-destructive)
const handleChangeLanguage = (next: LanguageCode) => {
  console.log("Changing language to", next);
  setLang(next);
  setData((prev: any) => {
    if (!prev?.sections) return prev;
    const patched = localizeDocTitles(prev, next, prevLangRef.current);
    prevLangRef.current = next;
    return patched;
  });
};


  const { rename, remove } = useResumeActions({
    withAuth,
    onRenamed: (_id, newTitle) => setTitle(newTitle),
    onDeleted: () => router.push("/builder"),
  });

  // Load once
  React.useEffect(() => {
    (async () => {
      const res = await fetch(`/api/resumes/${resumeId}`, await withAuth());
      if (res.status === 404) { router.replace("/builder"); return; }
      if (!res.ok) throw new Error("Failed to load");
      const json = (await res.json()) as LoadedResume;
      setLoaded(json);
      setTitle(json.title);
      setRenderer(json.renderer);
      setData(json.data ?? { id: "local", sections: [] });

   if (json.language) {
     const loadedLang = json.language as LanguageCode;
     setLang(loadedLang);
     prevLangRef.current = loadedLang;
   }
    })().catch(() => router.replace("/builder"));
  }, [resumeId, router]);

  // Save used by autosave
  const save = React.useCallback(
    async (payload: { title?: string; renderer?: string; data?: any; language?: string }) => {
      setSavingState("saving");
      try {
        await fetch(`/api/resumes/${resumeId}`, await withAuth({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })).then(async (r) => {
          if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            throw new Error(j?.error || "save_failed");
          }
        });

        // upload thumbnail (throttled)
        const now = Date.now();
        if (now - lastThumbUpload.current > 20_000 && wrapRef.current) {
          await new Promise(requestAnimationFrame);
          await new Promise((r) => setTimeout(r, 30));
          const blob = await captureThumbnailFromPreview(wrapRef.current, {
            scale: 2,
            background: "#ffffff",
            selector: "svg[data-page]",
          });
          if (blob) {
            await uploadThumbnail(String(resumeId), blob, withAuth).catch(() => {});
            lastThumbUpload.current = now;
          }
        }

        setSavingState("saved");
        setTimeout(() => setSavingState("idle"), 1200);
      } catch (e) {
        setSavingState("error");
        setTimeout(() => setSavingState("idle"), 1500);
        throw e;
      }
    },
    [resumeId]
  );

  // Autosave (title, renderer, data)
  useAutosave({
    key: `resume:${resumeId}`,
    data: { title, renderer, data, language: lang },
    save: (d) => save(d),
    delay: 1200,
    minInterval: 4000,
    enabled: !!loaded,
  });

  const handleDownload = async () => {
    if (!wrapRef.current) return;
    await exportSvgContainerToPdf(wrapRef.current, {
      filename: `resume-${new Date().toISOString().slice(0, 10)}.pdf`,
      selector: "svg[data-page]",
      scale: 2,
    });
  };

  const setDataSafe = React.useCallback((next: any) => {
    setData((prev: any) => (isEqual(prev, next) ? prev : next));
  }, []);

  React.useEffect(() => {
    if (!loaded) return;
    save({ language: lang });
  }, [lang, loaded, save]);

  if (!loaded) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen bg-white">
      <TopBar
      // key={`topbar-${lang}`}
        title={title}
        savingState={savingState}
        // inline title rename
        onInlineTitleCommit={(next) => {
          setTitle(next);
          // immediate rename via API (also will be autosaved)
          rename({ id: String(resumeId), title }, next);
        }}
        // optional modal rename still available from menu
        onRename={() => setRenameOpen(true)}
        onShare={() => {
          navigator.clipboard
            .writeText(location.origin + `/builder/${resumeId}/edit`)
            .then(() => toast.success("Link copied"))
            .catch(() => toast.error("Couldn’t copy link"));
        }}
        onDuplicate={async () => {
          const run = async () => {
            const r = await fetch(`/api/resumes/${resumeId}/duplicate`, await withAuth({ method: "POST" }));
            if (!r.ok) throw new Error(await r.text().catch(() => "Duplicate failed"));
            const j = await r.json();
            router.push(`/builder/${j.id}/edit`);
          };
          await toast.promise(run(), { loading: "Duplicating…", success: "Copied", error: (e)=> String(e) });
        }}
        onDownload={handleDownload}
        onDelete={() => setConfirmOpen(true)}
        dateFormat={dateFormat}
        onChangeDateFormat={setDateFormat}
        language={lang}
        onChangeLanguage={handleChangeLanguage}
        t={t}
      />

      <BuilderEditor
        // key={`builder-editor-${lang}`}
        initialData={data}
        onChangeData={setDataSafe}
        wrapRef={wrapRef}
        handleDownload={handleDownload}
        i18n={{ t, lang, months, skillLevels }}
        renderer={renderer}
        lang={lang}
        onChangeRenderer={setRenderer}
      />

      {/* Rename dialog (from menu) */}
      <RenameDialog
        open={renameOpen}
        initial={title || "Untitled CV"}
        onClose={() => setRenameOpen(false)}
        onSubmit={(next) => {
          setRenameOpen(false);
          if (!next || next === title) return;
          setTitle(next);
          rename({ id: String(resumeId), title }, next);
        }}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!confirmOpen}
        title="Delete this resume?"
        description={`“${title || "Untitled CV"}” will be permanently deleted.`}
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          remove({ id: String(resumeId), title });
        }}
      />
    </div>
  );
}
