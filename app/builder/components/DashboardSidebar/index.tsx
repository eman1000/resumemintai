"use client";
import * as React from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faChevronLeft, faChevronRight, faPlus, faGear, faDoorOpen, faHouse, faFileLines, faBriefcase, faEnvelope } from "@fortawesome/free-solid-svg-icons";

type Props = {
  userName: string;
  onNew: () => void;

  // desktop collapse
  collapsed: boolean;
  onToggleCollapse: () => void;

  // mobile drawer
  mobileOpen: boolean;
  onMobileClose: () => void;
};

export default function DashboardSidebar({
  userName,
  onNew,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}: Props) {
  // widths
  const W = collapsed ? "w-[72px]" : "w-[260px]";

  const Item = ({
    href,
    label,
    icon,
  }: {
    href: string;
    label: string;
    icon: any;
  }) => (
    <Link
      // @ts-ignore
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5"
      onClick={onMobileClose}
      title={label}
    >
      <FontAwesomeIcon style={{ alignSelf: "auto"}} icon={icon} className="w-4 h-4" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  const SidebarBody = (
    <aside
      className={`flex flex-col bg-[#0f0f10] text-white border-r border-white/10 ${W} transition-all duration-200`}
      role="navigation"
      aria-label="Sidebar"
      style={{ height: "100vh"}}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-4">
        <div className="flex items-center gap-2">
          <div className="bg-violet-600/20 text-violet-300 px-2 py-1 rounded-md text-xs font-semibold">
            R
          </div>
          {!collapsed && <div className="font-semibold">Resume Mint</div>}
        </div>

        {/* Collapse btn (desktop) */}
        <button
          className="hidden sm:grid place-items-center w-8 h-8 rounded-md hover:bg-white/10"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} className="w-4 h-4" />
        </button>

        {/* Close btn (mobile) */}
        <button
          className="sm:hidden grid place-items-center w-8 h-8 rounded-md hover:bg-white/10"
          onClick={onMobileClose}
          aria-label="Close sidebar"
          title="Close"
        >
          <FontAwesomeIcon icon={faBars} className="w-4 h-4 rotate-90" />
        </button>
      </div>

      {/* New button */}
      <div className="px-3 pb-3">
        <button
          onClick={onNew}
          className={`w-full flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 py-3`}
        >
          <FontAwesomeIcon style={{ alignSelf: "auto"}} icon={faPlus} className="w-4 h-4" />
          {!collapsed && <span className="font-medium">New</span>}
        </button>
      </div>

      {/* Nav */}
      <nav className="px-2 space-y-1">
        {/* <Item href="/builder" label="Dashboard" icon={faHouse} /> */}
        <Item href="/builder" label="CVs" icon={faFileLines} />
        <Item href="/jobs" label="Jobs" icon={faBriefcase} />
        {/* <Item href="/applications" label="Applications" icon={faEnvelope} /> */}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5">
          <div className="w-8 h-8 grid place-items-center rounded bg-white/10 text-xs">
            {userName?.charAt(0)?.toUpperCase() || "U"}
          </div>
          {!collapsed && <div className="truncate">{userName || "Account"}</div>}
        </div>
        <div className="mt-2 flex flex-col items-center gap-2">
          <Link
            href="/account"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10"
            onClick={onMobileClose}
            title="Settings"
          >
            <FontAwesomeIcon style={{ alignSelf: "auto"}} icon={faGear} className="w-4 h-4" />
            {!collapsed && <span>Settings</span>}
          </Link>
          <Link
            // @ts-ignore
            href="/logout"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10"
            onClick={onMobileClose}
            title="Log out"
          >
            <FontAwesomeIcon style={{ alignSelf: "auto"}} icon={faDoorOpen} className="w-4 h-4" />
            {!collapsed && <span>Log out</span>}
          </Link>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden sm:block">{SidebarBody}</div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onMobileClose}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0">{SidebarBody}</div>
        </div>
      )}
    </>
  );
}
