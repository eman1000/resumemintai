"use client";
import * as React from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faChevronLeft, faChevronRight, faPlus, faGear, faDoorOpen, faRightToBracket, faFileLines, faBriefcase, faEnvelope, faClipboardCheck } from "@fortawesome/free-solid-svg-icons";
import { useAuthStatus } from "@/hooks/useAuthStatus";

type Props = {
  userName: string;
  onNew: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
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
  const W = collapsed ? "w-[72px]" : "w-[260px]";
  const { isAuthenticated, loading: authLoading } = useAuthStatus();

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
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#52525a] hover:bg-gray-100 hover:text-[#1d1d20] transition-colors"
      onClick={onMobileClose}
      title={label}
    >
      <FontAwesomeIcon style={{ alignSelf: "auto"}} icon={icon} className="w-4 h-4" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  const SidebarBody = (
    <aside
      className={`flex flex-col bg-white text-[#1d1d20] border-r border-gray-200 ${W} transition-all duration-200`}
      role="navigation"
      aria-label="Sidebar"
      style={{ height: "100vh"}}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-4">
        <div className="flex items-center gap-2">
          <div className="bg-brand-50 text-brand px-2 py-1 rounded-md text-xs font-semibold">
            R
          </div>
          {!collapsed && <div className="font-semibold text-[#1d1d20]">Resume Mint</div>}
        </div>

        {/* Collapse btn (desktop) */}
        <button
          className="hidden sm:grid place-items-center w-8 h-8 rounded-md hover:bg-gray-100"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} className="w-4 h-4 text-[#52525a]" />
        </button>

        {/* Close btn (mobile) */}
        <button
          className="sm:hidden grid place-items-center w-8 h-8 rounded-md hover:bg-gray-100"
          onClick={onMobileClose}
          aria-label="Close sidebar"
          title="Close"
        >
          <FontAwesomeIcon icon={faBars} className="w-4 h-4 text-[#52525a] rotate-90" />
        </button>
      </div>

      {/* New button */}
      <div className="px-3 pb-3">
        <button
          onClick={onNew}
          className={`w-full flex items-center justify-center gap-2 rounded-lg bg-brand hover:bg-brand-700 text-white border-0 py-3 transition-colors`}
        >
          <FontAwesomeIcon style={{ alignSelf: "auto"}} icon={faPlus} className="w-4 h-4" />
          {!collapsed && <span className="font-medium">New</span>}
        </button>
      </div>

      {/* Nav */}
      <nav className="px-2 space-y-1">
        <Item href="/builder" label="CVs" icon={faFileLines} />
        <Item href="/builder/cover-letters" label="Cover Letters" icon={faEnvelope} />
        <Item href="/jobs" label="Jobs" icon={faBriefcase} />
        <Item href="/applications" label="Applications" icon={faClipboardCheck} />
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        {isAuthenticated ? (
          <>
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100">
              <div className="w-8 h-8 grid place-items-center rounded bg-gray-100 text-[#52525a] text-xs font-medium">
                {userName?.charAt(0)?.toUpperCase() || "U"}
              </div>
              {!collapsed && <div className="truncate text-sm text-[#1d1d20]">{userName || "Account"}</div>}
            </div>
            <div className="mt-2 flex flex-col items-center gap-1">
              <Link
                href="/account"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[#52525a] hover:bg-gray-100 transition-colors"
                onClick={onMobileClose}
                title="Settings"
              >
                <FontAwesomeIcon style={{ alignSelf: "auto" }} icon={faGear} className="w-4 h-4" />
                {!collapsed && <span className="text-sm">Settings</span>}
              </Link>
              <Link
                href="/logout"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[#52525a] hover:bg-gray-100 transition-colors"
                onClick={onMobileClose}
                title="Log out"
              >
                <FontAwesomeIcon style={{ alignSelf: "auto" }} icon={faDoorOpen} className="w-4 h-4" />
                {!collapsed && <span className="text-sm">Log out</span>}
              </Link>
            </div>
          </>
        ) : authLoading ? null : (
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-brand text-white hover:bg-brand-700 transition-colors"
            onClick={onMobileClose}
            title="Log in"
          >
            <FontAwesomeIcon style={{ alignSelf: "auto" }} icon={faRightToBracket} className="w-4 h-4" />
            {!collapsed && <span className="text-sm font-medium">Log in</span>}
          </Link>
        )}
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
            className="absolute inset-0 bg-black/30"
            onClick={onMobileClose}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0">{SidebarBody}</div>
        </div>
      )}
    </>
  );
}
