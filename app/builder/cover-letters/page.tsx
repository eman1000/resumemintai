"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import AuthGate from "@/components/AuthGate";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEllipsisVertical,
  faPen,
  faTrash,
  faBars,
} from "@fortawesome/free-solid-svg-icons";
import toast from "react-hot-toast";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import ConfirmDialog from "@/components/ConfirmDialog";
import { withAuth } from "@/app/builder/_client/withAuth";
import { auth } from "@/app/firebase";
import DashboardSidebar from "@/app/builder/components/DashboardSidebar";

type CardItem = {
  id: string;
  title: string;
  renderer: string;
  updatedAt: string;
  thumbnailUrl: string;
};

export default function CoverLettersHome() {
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [items, setItems] = React.useState<CardItem[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [confirmFor, setConfirmFor] = React.useState<CardItem | null>(null);

  const load = React.useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/cover-letters", await withAuth());
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as CardItem[];
      setItems(data);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load");
    } finally {
      setBusy(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

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
      if (e.key === "Escape") { setOpenMenu(null); setMobileOpen(false); }
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuAnchor]);

  const create = async () => {
    setBusy(true);
    try {
      const res = await fetch(
        "/api/cover-letters",
        await withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Untitled Cover Letter",
            renderer: "professional",
          }),
        })
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "create failed");
      router.push(`/builder/cover-letters/${json.id}/edit`);
    } catch (e: any) {
      toast.error(e?.message || "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: CardItem) => {
    try {
      const res = await fetch(
        `/api/cover-letters/${item.id}`,
        await withAuth({ method: "DELETE" })
      );
      if (!res.ok) throw new Error("Delete failed");
      setItems((cur) => cur?.filter((x) => x.id !== item.id) || null);
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  };

  return (
    <AuthGate>
      <div className="min-h-screen bg-[#f8fbfc] text-[#1d1d20] flex">
        <DashboardSidebar
          userName={auth?.currentUser?.displayName || auth?.currentUser?.email || "Account"}
          onNew={create}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <main className="flex-1 bg-[#f8fbfc] text-[#1d1d20]">
          <div className="sm:hidden sticky top-0 z-10 bg-white border-b border-gray-200">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <button
                className="grid place-items-center w-9 h-9 rounded-md hover:bg-gray-100"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <FontAwesomeIcon icon={faBars} className="w-4 h-4" />
              </button>
              <div className="font-semibold">Cover Letters</div>
              <div className="w-9 h-9" />
            </div>
          </div>
          <div className="max-w-6xl mx-auto py-6 px-4">
            <h1 className="text-2xl font-semibold mb-4">Cover Letters</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <button
                onClick={create}
                disabled={busy}
                className="aspect-[3/4] rounded-xl border-2 border-dashed border-brand text-brand grid place-items-center hover:bg-brand-50 transition-colors"
              >
                <div className="text-center">
                  <div className="text-3xl">＋</div>
                  <div>Create new cover letter</div>
                </div>
              </button>

              {(items || []).map((it) => {
                const isOpen = openMenu === it.id;
                // Bust the CDN cache when the cover letter was updated so the
                // thumbnail refreshes after edits.
                const thumbSrc = it.thumbnailUrl
                  ? `${it.thumbnailUrl}?ts=${encodeURIComponent(it.updatedAt || "")}`
                  : "";
                return (
                  <div key={it.id} className="group">
                    <Link
                      href={`/builder/cover-letters/${it.id}/edit`}
                      className="relative block aspect-[3/4] rounded-xl overflow-hidden border bg-white shadow hover:shadow-md transition"
                    >
                      {thumbSrc ? (
                        <img
                          src={thumbSrc}
                          alt={`${it.title || "Cover Letter"} thumbnail`}
                          className="absolute inset-0 h-full w-full object-cover object-top"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                            (e.currentTarget.parentElement as HTMLElement)?.classList.add("bg-gray-100");
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-gray-400 bg-gray-50">
                          <span className="text-sm">Cover Letter</span>
                        </div>
                      )}

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
                          className="absolute left-3 bottom-12 z-20 w-48 rounded-xl border bg-white shadow-xl overflow-hidden"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        >
                          <MenuItem label="Edit" icon={faPen} onClick={() => router.push(`/builder/cover-letters/${it.id}/edit`)} />
                          <div className="h-px bg-gray-100" />
                          <MenuItem
                            label="Delete"
                            icon={faTrash}
                            danger
                            onClick={() => { setOpenMenu(null); setConfirmFor(it); }}
                          />
                        </div>
                      )}
                    </Link>

                    <div className="mt-2">
                      <Link
                        href={`/builder/cover-letters/${it.id}/edit`}
                        className="font-medium text-brand hover:underline truncate block"
                        title={it.title || "Untitled Cover Letter"}
                      >
                        {it.title || "Untitled Cover Letter"}
                      </Link>
                      {it.updatedAt && (
                        <div className="text-sm text-[#a1a1aa]">
                          Edited {formatDistanceToNow(new Date(it.updatedAt))} ago
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {busy && <div className="mt-6 text-sm text-[#a1a1aa]">Loading…</div>}
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={!!confirmFor}
        title="Delete this cover letter?"
        description={`"${confirmFor?.title || "Untitled Cover Letter"}" will be permanently deleted.`}
        confirmText="Delete"
        onCancel={() => setConfirmFor(null)}
        onConfirm={() => {
          if (!confirmFor) return;
          const item = confirmFor;
          setConfirmFor(null);
          remove(item);
        }}
      />
    </AuthGate>
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
