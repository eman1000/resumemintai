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
import FullscreenLoader from "../../components/FullscreenLoader";
import LoginSlidePanel from "@/components/LoginSlidePanel";
import SubscribeSlidePanel from "@/components/SubscribeSlidePanel";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { trackResumeExported } from "@/lib/track";
import { consumeTailoredJdForResume } from "@/lib/checkerHandoff";

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
  const isLocal = String(resumeId).startsWith("local-");
  const [bootLang, setBootLang] = React.useState<LanguageCode | null>(null);

  React.useEffect(() => {
    if (isLocal) {
      setBootLang("en");
      return;
    }
    (async () => {
      try {
        const r = await fetch(`/api/resumes/${resumeId}`, await withAuth());
        const j = await r.json().catch(() => ({}));
        setBootLang((j?.language as LanguageCode) || "en");
      } catch {
        setBootLang("en");
      }
    })();
  }, [resumeId, isLocal]);

  if (!bootLang) return null;

  return (
    <LanguageProvider initial={bootLang}>
      <EditPageInner />
    </LanguageProvider>
  );
}


function EditPageInner() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const router = useRouter();
  const { isAuthenticated, isSubscribed, loading: authLoading } = useAuthStatus();
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [subscribeOpen, setSubscribeOpen] = React.useState(false);
  // True when the login panel was opened by a pro-feature gate; once login
  // completes we should chain into the subscribe panel without making the user
  // click the gated feature again.
  const [pendingProAfterLogin, setPendingProAfterLogin] = React.useState(false);

  React.useEffect(() => {
    if (!pendingProAfterLogin) return;
    if (!isAuthenticated || authLoading) return;
    setPendingProAfterLogin(false);
    if (!isSubscribed) setSubscribeOpen(true);
  }, [pendingProAfterLogin, isAuthenticated, authLoading, isSubscribed]);

  // Resume-checker handoff: pick up the JD the user was scoring against and
  // pass it into BuilderEditor so the Smart Tailor pane opens pre-filled.
  const [initialJdInput, setInitialJdInput] = React.useState<string | undefined>(undefined);
  React.useEffect(() => {
    if (!resumeId) return;
    const jd = consumeTailoredJdForResume(String(resumeId));
    if (jd) setInitialJdInput(jd);
  }, [resumeId]);

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
  // Throttle job-match toasts so the user isn't pestered after every keystroke.
  // 10-minute floor + we only fire after a "saved" transition, not every keypress.
  const lastMatchSuggest = React.useRef<number>(0);
  const matchSuggestInflight = React.useRef<boolean>(false);

  /** After a successful resume save, look for cached jobs that match this
   * resume and surface the top hit as a non-blocking toast. The user clicks
   * "Tailor it →" to jump to /jobs with that listing pre-focused. */
  const runMatchSuggest = React.useCallback(async () => {
    if (matchSuggestInflight.current) return;
    const now = Date.now();
    if (now - lastMatchSuggest.current < 10 * 60 * 1000) return; // 10 min
    matchSuggestInflight.current = true;
    try {
      const r = await fetch(
        "/api/jobs/match-for-resume",
        await withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // notify: 'email' lets the server fire a daily-capped email side-effect
          body: JSON.stringify({ resumeId: String(resumeId), notify: "email", minScore: 50 }),
        }),
      );
      if (!r.ok) return;
      const j = await r.json();
      const top = Array.isArray(j?.matches) ? j.matches[0] : null;
      if (!top) return;
      lastMatchSuggest.current = now;
      // Show a custom toast with a clickable CTA. Auto-dismiss after 10s.
      const subtitle = [top.company, top.location].filter(Boolean).join(" · ");
      toast.custom(
        (tt: any) => (
          <div
            role="status"
            className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border border-emerald-200 bg-white shadow-lg p-3"
          >
            <div className="mt-0.5 grid place-items-center h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-xs">
              {top.score}%
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[#1d1d20] truncate">
                Match for your resume
              </div>
              <div className="text-xs text-[#52525a] truncate">{top.title}</div>
              {subtitle && <div className="text-[11px] text-[#9ca3af] truncate">{subtitle}</div>}
              <div className="mt-2 flex items-center gap-2">
                <button
                  className="rounded-md bg-brand text-white text-xs font-medium px-2.5 py-1 hover:bg-brand-700"
                  onClick={() => {
                    toast.dismiss(tt.id);
                    router.push(top.focusUrl || `/jobs?source=${encodeURIComponent(top.source || "")}`);
                  }}
                >
                  Tailor it →
                </button>
                <button
                  className="text-xs text-[#6b7280] hover:text-[#1d1d20]"
                  onClick={() => toast.dismiss(tt.id)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ),
        { duration: 12_000 },
      );
    } catch {
      // non-fatal — purely a progressive enhancement
    } finally {
      matchSuggestInflight.current = false;
    }
  }, [resumeId, router]);

  const [dateFormat, setDateFormat] = React.useState<"MMM YYYY" | "MM/YYYY">("MMM YYYY");
  const { lang, setLang, t, months, skillLevels } = useI18n();
  const prevLangRef = React.useRef<LanguageCode>(lang);

  // when language changes: relabel default section titles (non-destructive)
const handleChangeLanguage = (next: LanguageCode) => {
  setLang(next);
  setData((prev: any) => {
    if (!prev?.sections) return prev;
    const patched = localizeDocTitles(prev, next);
    prevLangRef.current = next;
    return patched;
  });
};


  const { rename, remove } = useResumeActions({
    withAuth,
    onRenamed: (_id, newTitle) => setTitle(newTitle),
    onDeleted: () => router.push("/builder"),
  });

  const isLocal = String(resumeId).startsWith("local-");

  // Load once
  React.useEffect(() => {
    if (isLocal) {
      // Load from localStorage for anonymous users
      try {
        const stored = localStorage.getItem(`resume:${resumeId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setLoaded({ id: String(resumeId), title: parsed.title || "Untitled CV", renderer: parsed.renderer || "professional", data: parsed.data });
          setTitle(parsed.title || "Untitled CV");
          setRenderer(parsed.renderer || "professional");
          setData(parsed.data ?? { id: "local", sections: [] });
        } else {
          setLoaded({ id: String(resumeId), title: "Untitled CV", renderer: "professional", data: { id: "local", sections: [] } });
        }
      } catch {
        setLoaded({ id: String(resumeId), title: "Untitled CV", renderer: "professional", data: { id: "local", sections: [] } });
      }
      return;
    }
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
  }, [resumeId, router, isLocal]);

  // Save used by autosave
  const save = React.useCallback(
    async (payload: { title?: string; renderer?: string; data?: any; language?: string }) => {
      // For local resumes, save to localStorage only
      if (isLocal) {
        setSavingState("saving");
        try {
          const existing = JSON.parse(localStorage.getItem(`resume:${resumeId}`) || "{}");
          localStorage.setItem(`resume:${resumeId}`, JSON.stringify({ ...existing, ...payload }));
          setSavingState("saved");
          setTimeout(() => setSavingState("idle"), 1200);
        } catch {
          setSavingState("error");
          setTimeout(() => setSavingState("idle"), 1500);
        }
        return;
      }

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
            try {
              await uploadThumbnail(String(resumeId), blob, withAuth);
              lastThumbUpload.current = now;
            } catch (e: any) {
              // Log so we can spot a misconfigured Firebase bucket / auth in dev.
              // Don't toast (would spam on every save) and don't update the
              // throttle clock — that way we retry on the next save instead
              // of waiting another 20s.
              console.warn('[thumbnail-upload] failed:', e?.message || e);
            }
          }
        }

        setSavingState("saved");
        setTimeout(() => setSavingState("idle"), 1200);

        // After a successful save, fire a (throttled) job-match check.
        // Skipped for local-only resumes and when nothing's actually changed.
        // No await — purely fire-and-forget; the toast appears on its own.
        if (!isLocal) {
          void runMatchSuggest();
        }
      } catch (e) {
        setSavingState("error");
        setTimeout(() => setSavingState("idle"), 1500);
        throw e;
      }
    },
    [resumeId, isLocal, runMatchSuggest]
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
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }
    if (!isSubscribed) {
      router.push('/landing/vtdft');
      return;
    }
    if (!wrapRef.current) return;
    await exportSvgContainerToPdf(wrapRef.current, {
      filename: `resume-${new Date().toISOString().slice(0, 10)}.pdf`,
      selector: "svg[data-page]",
      scale: 2,
    });
    trackResumeExported({
      resumeId: typeof resumeId === 'string' ? resumeId : null,
      renderer: loaded?.renderer ?? null,
      page: 'builder_editor',
    });
  };

  const setDataSafe = React.useCallback((next: any) => {
    setData((prev: any) => (isEqual(prev, next) ? prev : next));
  }, []);

  React.useEffect(() => {
    if (!loaded) return;
    save({ language: lang });
  }, [lang, loaded, save]);

  if (!loaded) return <FullscreenLoader label={"Loading..."} />;

  return (
    <div className="min-h-screen bg-white">
      <LoginSlidePanel
        open={loginOpen}
        onClose={() => {
          setLoginOpen(false);
          setPendingProAfterLogin(false);
        }}
        onSuccess={() => setLoginOpen(false)}
        reason={pendingProAfterLogin
          ? "Sign in to unlock premium templates and features."
          : "Sign in to download your resume."}
      />
      <SubscribeSlidePanel
        open={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />
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
        dateFormat={dateFormat}
        onChangeRenderer={setRenderer}
        isSubscribed={isSubscribed}
        initialJdInput={initialJdInput}
        onAuthGate={() => {
          if (!isAuthenticated) {
            setPendingProAfterLogin(true);
            setLoginOpen(true);
            return;
          }
          if (!isSubscribed) { setSubscribeOpen(true); }
        }}
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
