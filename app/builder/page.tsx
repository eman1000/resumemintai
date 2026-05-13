"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import LoginSlidePanel from "@/components/LoginSlidePanel";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEllipsisVertical,
  faPen,
  faTag,
  faEye,
  faDownload,
  faTrash,
  faBars,
} from "@fortawesome/free-solid-svg-icons";
import toast from "react-hot-toast";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import ConfirmDialog from "@/components/ConfirmDialog";
import RenameDialog from "@/components/RenameDialog";
import { withAuth } from "./_client/withAuth";
import { useResumeActions } from "./hooks/useResumeActions";

// ⬇️ sidebar
import { auth } from "@/app/firebase";
import DashboardSidebar from "./components/DashboardSidebar";

type CardItem = {
  id: string;
  title: string;
  renderer: string;
  updatedAt: string;
  thumbnailUrl: string;
};

export default function BuilderHome() {
  const router = useRouter();
  const { user, isAuthenticated, isSubscribed, loading: authLoading } = useAuthStatus();

  // Login slide panel
  const [loginOpen, setLoginOpen] = React.useState(false);

  // NEW: sidebar state
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const [items, setItems] = React.useState<CardItem[] | null>(null);
  const [busy, setBusy] = React.useState(false);

  // menu state
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);

  // dialogs state
  const [renameFor, setRenameFor] = React.useState<CardItem | null>(null);
  const [confirmFor, setConfirmFor] = React.useState<CardItem | null>(null);

  // actions hook – update local list on success
  const { rename, remove } = useResumeActions({
    withAuth,
    onRenamed: (id, newTitle) =>
      setItems((cur) => cur?.map((x) => (x.id === id ? { ...x, title: newTitle } : x)) || null),
    onDeleted: (id) =>
      setItems((cur) => cur?.filter((x) => x.id !== id) || null),
  });

  const load = React.useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/resumes", await withAuth());
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as CardItem[];
      setItems(data);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load");
    } finally {
      setBusy(false);
    }
  }, [isAuthenticated]);

  React.useEffect(() => { if (!authLoading) load(); }, [load, authLoading]);

  // close menu on outside click / ESC
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuAnchor) return;
      const t = e.target as Node;
      if (menuAnchor.contains(t)) return;
      const dropdown = menuAnchor.parentElement?.querySelector('[role="menu"]');
      if (dropdown && dropdown.contains(t)) return;
      setOpenMenu(null);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuAnchor]);

  const create = async () => {
    if (!isAuthenticated) {
      // Allow anonymous users to start editing with a local-only resume
      const localId = "local-" + crypto.randomUUID();
      // Store empty resume data in localStorage for the editor to pick up
      localStorage.setItem(
        `resume:${localId}`,
        JSON.stringify({ title: "Untitled CV", renderer: "professional", data: { id: "local", sections: [] } })
      );
      router.push(`/builder/${localId}/edit`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        "/api/resumes",
        await withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Untitled CV",
            renderer: "professional",
            data: { id: "local", sections: [] },
          }),
        })
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "create failed");
      router.push(`/builder/${json.id}/edit`);
    } catch (e: any) {
      toast.error(e?.message || "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDetails = (it: CardItem) => {
    toast(`Renderer: ${it.renderer}\nUpdated: ${formatDistanceToNow(new Date(it.updatedAt))} ago`);
    setOpenMenu(null);
  };

  const handleDownloadCard = (it: CardItem) => {
    router.push(`/builder/${it.id}/edit?download=1`);
    setOpenMenu(null);
  };

  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, []);

  return (
    <>
      <LoginSlidePanel
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => {
          setLoginOpen(false);
          load();
        }}
        reason="Sign in to create and manage your resumes."
      />
      {/* Sidebar layout */}
      <div className="min-h-screen bg-[#f8fbfc] text-[#1d1d20] flex">
          {/* Sidebar */}
        <DashboardSidebar
          userName={auth?.currentUser?.displayName || auth?.currentUser?.email || "Account"}
          onNew={create}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />


        {/* Main area */}
        <main className="flex-1 bg-[#f8fbfc] text-[#1d1d20]">
          {/* Top bar with hamburger (mobile only) */}
          <div className="sm:hidden sticky top-0 z-10 bg-white border-b border-gray-200">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <button
                className="grid place-items-center w-9 h-9 rounded-md hover:bg-black/5"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <FontAwesomeIcon icon={faBars} className="w-4 h-4" />
              </button>
              <div className="font-semibold">CVs</div>
              <div className="w-9 h-9" />
            </div>
          </div>
          <div className="max-w-6xl mx-auto py-6 px-4">
            <h1 className="text-2xl font-semibold mb-4">CVs</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* New card (kept here too) */}
              <button
                onClick={create}
                disabled={busy}
                className="aspect-[3/4] rounded-xl border-2 border-dashed grid place-items-center text-gray-500 hover:bg-white/40"
              >
                <div className="text-center">
                  <div className="text-3xl">＋</div>
                  <div>Create new CV</div>
                </div>
              </button>

              {/* Items */}
              {(items || []).map((it) => {
                const thumbSrc = it.thumbnailUrl
                  ? `${it.thumbnailUrl}?ts=${encodeURIComponent(it.updatedAt || "")}`
                  : "";
                const isOpen = openMenu === it.id;

                return (
                  <div key={it.id} className="group">
                    <Link
                      href={`/builder/${it.id}/edit`}
                      className="relative block aspect-[3/4] rounded-xl overflow-hidden border bg-white shadow hover:shadow-md transition"
                    >
                      {thumbSrc ? (
                        <img
                          src={thumbSrc}
                          alt={`${it.title || "Resume"} thumbnail`}
                          className="absolute inset-0 h-full w-full"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                            (e.currentTarget.parentElement as HTMLElement)?.classList.add("bg-gray-100");
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-gray-400 bg-gray-100">
                          <span className="text-sm">No thumbnail</span>
                        </div>
                      )}

                      {/* 3-dot */}
                      <button
                        type="button"
                        aria-label="Open menu"
                        className="absolute right-3 bottom-3 z-10 p-2 rounded-full bg-white/95 shadow border hover:bg-white"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenu((prev) => (prev === it.id ? null : it.id));
                          setMenuAnchor(e.currentTarget);
                        }}
                      >
                        <FontAwesomeIcon icon={faEllipsisVertical} className="h-2 w-2 text-gray-700" />
                      </button>

                      {isOpen && (
                        <div
                          role="menu"
                          className="absolute left-3 bottom-12 z-20 w-64 rounded-xl border bg-white shadow-xl overflow-hidden"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <MenuItem label="Edit"    icon={faPen} onClick={() => router.push(`/builder/${it.id}/edit`)} />
                          <MenuItem label="Rename"  icon={faTag} onClick={() => { setOpenMenu(null); setRenameFor(it); }} />
                          <MenuItem label="Details" icon={faEye} onClick={() => handleDetails(it)} />
                          <div className="h-px bg-gray-100" />
                          <MenuItem label="Download" icon={faDownload} onClick={() => handleDownloadCard(it)} />
                          <div className="h-px bg-gray-100" />
                          <MenuItem
                            label="Delete"
                            icon={faTrash}
                            danger
                            onClick={() => {
                              setOpenMenu(null);
                              setConfirmFor(it);
                            }}
                          />
                        </div>
                      )}
                    </Link>

                    <div className="mt-2">
                      <Link
                        href={`/builder/${it.id}/edit`}
                        className="font-medium text-blue-700 hover:underline truncate block"
                        title={it.title || "Untitled CV"}
                      >
                        {it.title || "Untitled CV"}
                      </Link>
                      {it.updatedAt && (
                        <div className="text-sm text-gray-500">
                          Edited {formatDistanceToNow(new Date(it.updatedAt))} ago
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {busy && <div className="mt-6 text-sm text-gray-500">Loading…</div>}
          </div>
        </main>
      </div>

      {/* Rename dialog */}
      <RenameDialog
        open={!!renameFor}
        initial={renameFor?.title || "Untitled CV"}
        onClose={() => setRenameFor(null)}
        onSubmit={(nextTitle) => {
          if (!renameFor) return;
          const r = { id: renameFor.id, title: renameFor.title };
          setRenameFor(null);
          rename(r, nextTitle);
        }}
      />

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!confirmFor}
        title="Delete this resume?"
        description={`“${confirmFor?.title || "Untitled CV"}” will be permanently deleted.`}
        confirmText="Delete"
        onCancel={() => setConfirmFor(null)}
        onConfirm={() => {
          if (!confirmFor) return;
          const r = { id: confirmFor.id, title: confirmFor.title };
          setConfirmFor(null);
          remove(r);
        }}
      />
    </>
  );
}

function MenuItem({
  label,
  icon,
  onClick,
  danger,
}: {
  label: string;
  icon: IconProp;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 ${
        danger ? "text-red-600 hover:bg-red-50" : "text-gray-800"
      }`}
      onClick={onClick}
    >
      <FontAwesomeIcon icon={icon} className={`h-5 w-5 ${danger ? "text-red-600" : "text-gray-700"}`} />
      <span className="font-medium">{label}</span>
    </button>
  );
}
