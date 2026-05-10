"use client";

import React from "react";

const FONT_OPTIONS = [
  { label: "Arial", value: "Arial" },
  { label: "Helvetica", value: "Helvetica" },
  { label: "Inter", value: "Inter" },
  { label: "Poppins", value: "Poppins" },
  { label: "Roboto", value: "Roboto" },
  { label: "Open Sans", value: "Open Sans" },
  { label: "Lato", value: "Lato" },
  { label: "Montserrat", value: "Montserrat" },
  { label: "Source Sans Pro", value: "Source Sans Pro" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Georgia", value: "Georgia" },
  { label: "Garamond", value: "Garamond" },
  { label: "Merriweather", value: "Merriweather" },
];

const SIZE_OPTIONS: { label: string; value: "s" | "m" | "l" }[] = [
  { label: "S", value: "s" },
  { label: "M", value: "m" },
  { label: "L", value: "l" },
];

const SPACING_OPTIONS = [
  { label: "1.0", value: 1.0 },
  { label: "1.15", value: 1.15 },
  { label: "1.25", value: 1.25 },
  { label: "1.5", value: 1.5 },
  { label: "2.0", value: 2.0 },
];

const COLOR_PRESETS = [
  "#1f2937", "#0f172a", "#111827",
  "#1d4ed8", "#2563eb", "#3b82f6",
  "#0e7490", "#0891b2", "#14b8a6",
  "#15803d", "#16a34a", "#65a30d",
  "#b45309", "#d97706", "#f59e0b",
  "#b91c1c", "#dc2626", "#ef4444",
  "#9333ea", "#7e22ce", "#a855f7",
  "#831843", "#9d174d", "#db2777",
  "#395a86", "#304636", "#641346",
];

type Template = {
  id: string;
  name: string;
  renderer: string;
  documentType?: string;
  isFree?: boolean;
};

type BottomToolbarProps = {
  templates: Template[];
  activeTemplateId: string;
  onSelectTemplate: (id: string) => void;
  isSubscribed: boolean;
  onAuthGate?: () => void;

  fontName: string;
  onChangeFontName: (name: string) => void;

  fontSizeKey: "s" | "m" | "l";
  onChangeFontSize: (k: "s" | "m" | "l") => void;

  lineHeight: number;
  onChangeLineHeight: (v: number) => void;

  primaryColor: string;
  onChangePrimaryColor: (hex: string) => void;

  onFullscreen?: () => void;
};

const Caret = () => (
  <svg viewBox="0 0 12 8" width="10" height="7" aria-hidden="true" className="opacity-60">
    <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TemplatesIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <rect x="3" y="4" width="6" height="16" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <rect x="11" y="4" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <rect x="11" y="13" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const FontIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      d="M5 19l5-14h2l5 14M7.5 14h7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SizeIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      d="M4 7h7M7.5 7v11M13 12h7M16.5 12v6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const SpacingIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const ColorIcon = ({ color }: { color: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M12 3l7 7-7 7-3.5-3.5L4 17l-1 4 4-1 3.5-3.5L12 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    <span
      className="inline-block h-3.5 w-3.5 rounded-sm border border-gray-300"
      style={{ backgroundColor: color }}
    />
  </span>
);

const FullscreenIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function Menu({
  open,
  onOpen,
  onClose,
  trigger,
  align = "center",
  panelClassName = "",
  children,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  trigger: (opts: { open: boolean; toggle: () => void }) => React.ReactNode;
  align?: "left" | "center" | "right";
  panelClassName?: string;
  children: React.ReactNode;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const toggle = () => (open ? onClose() : onOpen());

  const alignCls =
    align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";

  return (
    <div ref={containerRef} className="relative">
      {trigger({ open, toggle })}
      {open && (
        <div
          className={`absolute bottom-full mb-2 ${alignCls} z-50 rounded-xl border border-gray-200 bg-white shadow-xl ${panelClassName}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function TriggerBtn({
  onClick,
  active,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`
        inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm
        transition-colors select-none whitespace-nowrap
        ${active ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "hover:bg-gray-50 text-gray-800"}
      `}
    >
      {children}
    </button>
  );
}

export function BottomToolbar(props: BottomToolbarProps) {
  const {
    templates,
    activeTemplateId,
    onSelectTemplate,
    isSubscribed,
    onAuthGate,
    fontName,
    onChangeFontName,
    fontSizeKey,
    onChangeFontSize,
    lineHeight,
    onChangeLineHeight,
    primaryColor,
    onChangePrimaryColor,
    onFullscreen,
  } = props;

  type MenuId = "templates" | "font" | "size" | "spacing" | "color";
  const [openMenu, setOpenMenu] = React.useState<MenuId | null>(null);

  const sizeLabel = (SIZE_OPTIONS.find((s) => s.value === fontSizeKey) ?? SIZE_OPTIONS[1]).label;

  return (
    <div className="sticky bottom-3 z-20 mt-3 flex justify-center">
      <div
        className="
          flex flex-wrap items-center gap-1
          rounded-full border border-gray-200 bg-white/95 backdrop-blur
          px-2 py-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.08)]
          max-w-full
        "
      >
        {/* Templates */}
        <Menu
          open={openMenu === "templates"}
          onOpen={() => setOpenMenu("templates")}
          onClose={() => setOpenMenu(null)}
          align="left"
          panelClassName="w-[min(92vw,520px)] p-3"
          trigger={({ open, toggle }) => (
            <TriggerBtn onClick={toggle} active={open} ariaLabel="Templates">
              <TemplatesIcon />
              <span className="hidden sm:inline">Templates</span>
              <Caret />
            </TriggerBtn>
          )}
        >
          <div className="mb-2 text-sm font-semibold text-gray-700">Choose a template</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto pr-1">
            {templates.map((t) => {
              const locked = !t.isFree && !isSubscribed;
              const active = t.id === activeTemplateId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    if (locked) {
                      onAuthGate?.();
                      return;
                    }
                    onSelectTemplate(t.id);
                    setOpenMenu(null);
                  }}
                  className={`
                    group relative rounded-lg border p-2 text-left text-xs transition-all
                    ${active ? "border-blue-500 ring-2 ring-blue-200 bg-blue-50/40" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}
                  `}
                >
                  <div className="aspect-[3/4] w-full rounded-md bg-gradient-to-br from-gray-100 to-gray-200 mb-2 flex items-center justify-center text-gray-400 text-[10px] uppercase tracking-wide">
                    {t.renderer}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium capitalize truncate">{t.name}</span>
                    {!t.isFree && (
                      <span className="text-[10px] rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 font-medium">
                        PRO
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Menu>

        <span className="mx-1 h-5 w-px bg-gray-200" />

        {/* Font name */}
        <Menu
          open={openMenu === "font"}
          onOpen={() => setOpenMenu("font")}
          onClose={() => setOpenMenu(null)}
          panelClassName="w-56 py-1 max-h-[50vh] overflow-y-auto"
          trigger={({ open, toggle }) => (
            <TriggerBtn onClick={toggle} active={open} ariaLabel="Font">
              <FontIcon />
              <span className="hidden sm:inline truncate max-w-[120px]" style={{ fontFamily: fontName }}>
                {fontName}
              </span>
              <Caret />
            </TriggerBtn>
          )}
        >
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                onChangeFontName(f.value);
                setOpenMenu(null);
              }}
              className={`
                flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-gray-50
                ${fontName === f.value ? "bg-blue-50 text-blue-700" : "text-gray-800"}
              `}
              style={{ fontFamily: f.value }}
            >
              <span>{f.label}</span>
              {fontName === f.value && <span className="text-xs">✓</span>}
            </button>
          ))}
        </Menu>

        {/* Size */}
        <Menu
          open={openMenu === "size"}
          onOpen={() => setOpenMenu("size")}
          onClose={() => setOpenMenu(null)}
          panelClassName="w-32 py-1"
          trigger={({ open, toggle }) => (
            <TriggerBtn onClick={toggle} active={open} ariaLabel="Font size">
              <SizeIcon />
              <span className="hidden sm:inline">{sizeLabel}</span>
              <Caret />
            </TriggerBtn>
          )}
        >
          {SIZE_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => {
                onChangeFontSize(s.value);
                setOpenMenu(null);
              }}
              className={`
                flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-gray-50
                ${fontSizeKey === s.value ? "bg-blue-50 text-blue-700" : "text-gray-800"}
              `}
            >
              <span>{s.label}</span>
              {fontSizeKey === s.value && <span className="text-xs">✓</span>}
            </button>
          ))}
        </Menu>

        {/* Line spacing */}
        <Menu
          open={openMenu === "spacing"}
          onOpen={() => setOpenMenu("spacing")}
          onClose={() => setOpenMenu(null)}
          panelClassName="w-32 py-1"
          trigger={({ open, toggle }) => (
            <TriggerBtn onClick={toggle} active={open} ariaLabel="Line spacing">
              <SpacingIcon />
              <span className="hidden sm:inline">{lineHeight.toFixed(2).replace(/\.?0+$/, "")}</span>
              <Caret />
            </TriggerBtn>
          )}
        >
          {SPACING_OPTIONS.map((sp) => (
            <button
              key={sp.value}
              type="button"
              onClick={() => {
                onChangeLineHeight(sp.value);
                setOpenMenu(null);
              }}
              className={`
                flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-gray-50
                ${Math.abs(lineHeight - sp.value) < 0.01 ? "bg-blue-50 text-blue-700" : "text-gray-800"}
              `}
            >
              <span>{sp.label}</span>
              {Math.abs(lineHeight - sp.value) < 0.01 && <span className="text-xs">✓</span>}
            </button>
          ))}
        </Menu>

        {/* Color */}
        <Menu
          open={openMenu === "color"}
          onOpen={() => setOpenMenu("color")}
          onClose={() => setOpenMenu(null)}
          align="right"
          panelClassName="w-64 p-3"
          trigger={({ open, toggle }) => (
            <TriggerBtn onClick={toggle} active={open} ariaLabel="Primary color">
              <ColorIcon color={primaryColor} />
              <Caret />
            </TriggerBtn>
          )}
        >
          <div className="text-xs font-semibold text-gray-700 mb-2">Primary color</div>
          <div className="grid grid-cols-9 gap-1.5 mb-3">
            {COLOR_PRESETS.map((c) => {
              const active = c.toLowerCase() === primaryColor.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChangePrimaryColor(c)}
                  aria-label={`Pick ${c}`}
                  className={`
                    h-6 w-6 rounded-md border transition-transform
                    ${active ? "ring-2 ring-offset-1 ring-blue-500 scale-110" : "border-gray-200 hover:scale-110"}
                  `}
                  style={{ backgroundColor: c }}
                />
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <span>Custom</span>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => onChangePrimaryColor(e.target.value)}
              className="h-7 w-10 cursor-pointer rounded border border-gray-200 bg-white p-0"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#?[0-9a-fA-F]{0,6}$/.test(v)) {
                  onChangePrimaryColor(v.startsWith("#") ? v : `#${v}`);
                }
              }}
              className="ml-auto w-20 rounded border border-gray-200 px-2 py-1 text-xs font-mono"
            />
          </label>
        </Menu>

        {onFullscreen && (
          <>
            <span className="mx-1 h-5 w-px bg-gray-200" />
            <TriggerBtn onClick={onFullscreen} ariaLabel="Fullscreen preview">
              <FullscreenIcon />
            </TriggerBtn>
          </>
        )}
      </div>
    </div>
  );
}

export default BottomToolbar;
