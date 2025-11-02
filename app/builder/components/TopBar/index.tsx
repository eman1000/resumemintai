// TopBar.tsx
"use client";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotate, faCloud } from "@fortawesome/free-solid-svg-icons";
import { BASE_LANG_LABELS } from "@/lib/i18n";

type DateFormat = "MMM YYYY" | "MM/YYYY";
type LanguageCode =
  | "ar" | "bg" | "zh-Hans" | "zh-Hant" | "cs" | "da" | "nl" | "en" | "en-UK"
  | "fi" | "fr" | "de" | "el" | "he" | "hu" | "id" | "it" | "ja" | "ko"
  | "ms" | "no" | "pl" | "pt" | "pt-BR" | "ro" | "ru" | "sk" | "es" | "sv" | "th" | "tr" | "uk" | "vi";

export type SavingState = "idle" | "saving" | "saved" | "error";

export interface TopBarProps {
  title: string;
  onUndo?: () => void;
  onRedo?: () => void;
  onRename?: () => void;
  onShare?: () => void;
  onDuplicate?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onInlineTitleCommit?: (next: string) => void;

  dateFormat: DateFormat;
  onChangeDateFormat?: (fmt: DateFormat) => void;
  language: LanguageCode;
  onChangeLanguage?: (code: LanguageCode) => void;

  savingState?: SavingState;
  t: (k: string, fb?: string) => string;
}



export default function TopBar({
  title,
  onUndo, onRedo, onRename, onShare, onDuplicate, onDownload, onDelete,
  onInlineTitleCommit,
  dateFormat, onChangeDateFormat, language, onChangeLanguage,
  savingState = "idle",
  t,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  // inline title state
  const [editing, setEditing] = React.useState(false);
  const [localTitle, setLocalTitle] = React.useState(title);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => setLocalTitle(title), [title]);

  // close menu on outside click
  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  React.useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitInlineTitle = () => {
    setEditing(false);
    const trimmed = (localTitle || "").trim();
    if (!trimmed || trimmed === title) return;
    onInlineTitleCommit?.(trimmed);
  };
  const cancelInlineTitle = () => {
    setEditing(false);
    setLocalTitle(title);
  };

  const StatusIcon = () => (
    <div
      className="ml-2 w-4 h-4 grid place-items-center"
      title={
        savingState === "saving"
          ? t("status.saving", "Saving…")
          : t("status.saved", "Saved")
      }
    >
      <FontAwesomeIcon
        icon={savingState === "saving" ? faRotate : faCloud}
        className={savingState === "saving" ? "animate-spin" : ""}
        size="sm"
      />
    </div>
  );

  const DateItem: React.FC<{ label: string; value: DateFormat }> = ({ label, value }) => (
    <button
      className={`w-full text-left px-3 py-2 rounded text-gray-100 hover:bg-white/10 ${
        dateFormat === value ? "font-semibold" : ""
      }`}
      onClick={() => { onChangeDateFormat?.(value); setMenuOpen(false); }}
    >
      <span className="inline-block w-5">{dateFormat === value ? "✓" : ""}</span>
      {label}
    </button>
  );

  const LangItem: React.FC<{ code: LanguageCode }> = ({ code }) => {
    const active = language === code;
    return (
      <button
        className={`w-full text-left px-3 py-2 rounded text-gray-100 hover:bg-white/10 ${active ? "font-semibold" : ""}`}
        onClick={() => { onChangeLanguage?.(code); setMenuOpen(false); }}
      >
        <span className="inline-block w-5">{active ? "✓" : ""}</span>
        {/* Use i18n if available, otherwise fallback to English label */}
        {t(`lang.${code}`, BASE_LANG_LABELS[code])}
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-30 bg-neutral-900/90 text-gray-100 backdrop-blur border-b border-white/10">
      <div className="max-w-7xl mx-auto h-14 px-3 md:px-4 flex items-center gap-2">
        <button
          className="mr-1 rounded-full p-2 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          aria-label={t("top.back", "Back to CVs")}
          onClick={() => history.back()}
          title={t("top.back", "Back to CVs")}
        >
          <span className="text-xl">←</span>
        </button>

        {/* Title inline editor */}
        <div className="flex-1 min-w-0 flex items-center">
          {editing ? (
            <input
              ref={inputRef}
              className="w-full bg-transparent outline-none border-b border-blue-400 text-xl font-semibold tracking-tight"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={commitInlineTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitInlineTitle();
                if (e.key === "Escape") cancelInlineTitle();
              }}
            />
          ) : (
            <button
              className="text-left truncate text-xl font-semibold tracking-tight hover:underline decoration-blue-400"
              title={t("top.clickToRename", "Click to rename")}
              onClick={() => setEditing(true)}
            >
              {title || t("doc.untitled", "Untitled CV")}
            </button>
          )}

          <StatusIcon />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onDownload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-500"
          >
            {t("top.download", "Download")}
          </button>

          {/* Kebab menu */}
          <div className="relative" ref={menuRef}>
            <button
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(v => !v)}
              className="w-10 h-10 rounded-full border border-white/15 hover:bg-white/10 flex items-center justify-center text-2xl leading-none"
              title={t("top.more", "More")}
            >
              ⋯
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-72 max-h-[70vh] overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-neutral-900 shadow-xl shadow-black/40 p-2 z-[60]"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <button role="menuitem" className="w-full text-left px-3 py-2 rounded hover:bg-white/10" onClick={() => { onUndo?.(); setMenuOpen(false); }}>
                  {t("top.undo", "Undo")}
                </button>
                <button role="menuitem" className="w-full text-left px-3 py-2 rounded hover:bg-white/10" onClick={() => { onRedo?.(); setMenuOpen(false); }}>
                  {t("top.redo", "Redo")}
                </button>

                <div className="my-2 h-px bg-white/10" />

                {onRename && (
                  <button role="menuitem" className="w-full text-left px-3 py-2 rounded hover:bg-white/10" onClick={() => { onRename?.(); setMenuOpen(false); }}>
                    {t("top.rename", "Rename")}
                  </button>
                )}
                <button role="menuitem" className="w-full text-left px-3 py-2 rounded hover:bg-white/10" onClick={() => { onShare?.(); setMenuOpen(false); }}>
                  {t("top.share", "Share")}
                </button>
                <button role="menuitem" className="w-full text-left px-3 py-2 rounded hover:bg-white/10" onClick={() => { onDuplicate?.(); setMenuOpen(false); }}>
                  {t("top.duplicate", "Duplicate")}
                </button>

                {onDelete && (
                  <>
                    <div className="my-2 h-px bg-white/10" />
                    <button
                      role="menuitem"
                      className="w-full text-left px-3 py-2 rounded hover:bg-white/10 text-red-300"
                      onClick={() => { onDelete?.(); setMenuOpen(false); }}
                    >
                      {t("top.delete", "Delete")}
                    </button>
                  </>
                )}

                <div className="my-2 h-px bg-white/10" />

                <div className="px-3 py-2 text-xs font-semibold text-gray-400">
                  {t("top.dateFormat", "DATE FORMAT")}
                </div>
                {/* <DateItem label={t("date.sample.mmmYYYY", "Oct 2025")} value="MMM YYYY" />
                <DateItem label={t("date.sample.mmYYYY", "10/2025")} value="MM/YYYY" /> */}

                <div className="my-2 h-px bg-white/10" />

                <div className="px-3 py-2 text-xs font-semibold text-gray-400">
                  {t("top.language", "LANGUAGE")}
                </div>
                {(
                  [
                    "ar","bg","zh-Hans","zh-Hant","cs","da","nl","en","en-UK","fi","fr","de",
                    "el","he","hu","id","it","ja","ko","ms","no","pl","pt","pt-BR","ro","ru",
                    "sk","es","sv","th","tr","uk","vi",
                  ] as LanguageCode[]
                ).map(code => (
                  <LangItem key={code} code={code} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
