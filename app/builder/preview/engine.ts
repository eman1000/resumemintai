/* eslint-disable @typescript-eslint/no-explicit-any */

export type AnyObject = Record<string, any>;

export type RenderContext = {
  /** Whole document incl. sections */
  document: AnyObject;
  /** Current section when iterating "sections" */
  section?: AnyObject | null;
  /** Current record when iterating "records" */
  record?: AnyObject | null;
  /** Template defaultOptions for !ref lookups */
  defaults: AnyObject;
  /** Arbitrary stack-local vars (x/y/width etc.) managed by the caller if desired */
  vars?: AnyObject;
};

export type ColumnSpec = {
  width?: number | string; // number px, "max", "40%", etc.
  content?: TemplateNode[];
};

export type TemplateNode = {
  // Structural
  columns?: ColumnSpec[];
  content?: TemplateNode[];
  switch?: TemplateNode[]; // branches, each may carry conditionAll/Some
  valueKey?: string;

  // Styling / drawing
  text?: TextRun[];
  shape?: ShapeRun[];
  background?: ShapeRun[];

  // Layout helpers
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;

  // Conditions
  conditionAll?: string;   // "a,b,!c,+d"
  conditionSome?: string;  // "a,b,!c,+d"

  // Arbitrary passthrough (fontName, fontSize, fontStyle, align, color, etc.)
  [k: string]: any;
};

export type TextRun = {
  valueKey?: string | null;   // e.g. "fields.header", "headline"
  value?: string | null;      // literal fallback
  type?: "singleline" | "richtext"; // we flatten richtext to plain text
  color?: string;
  fontName?: string;
  fontSize?: number;
  fontStyle?: "bold" | "normal" | "italic";
  align?: "left" | "center" | "right";
  lineHeight?: number;
  top?: number;
  bottom?: number;
  decoration?: AnyObject;     // e.g., progress bars / circles (you can map to backend)
  lineBreakToText?: string;   // e.g., ", " for arrays
};

export type ShapeRun = {
  // rect / circle / image / icon / transparentImage
  type: "rect" | "circle" | "image" | "icon" | "transparentImage";
  color?: string;
  left?: number;
  top?: number;
  width?: number | "max";
  height?: number | "max";
  radius?: number | string; // number or "50%"
  right?: number;           // for images that say "right": 10 (to fill remaining)
  bottom?: number;
  bottomRadius?: number;
  value?: string;           // icon name, etc.
  valueKey?: string;        // where to get image data from, etc.
};

export type Backend = {
  // Layout stack
  pushFrame(p: Partial<{ x: number; y: number; w: number; h: number }>): void;
  popFrame(): void;
  // Measurements
  getFrame(): { x: number; y: number; w: number; h: number };
  // Drawing
  drawText(run: Required<TextRun> & { x: number; y: number; maxWidth: number }): void;
  drawRect(run: Required<ShapeRun> & { x: number; y: number; w: number; h: number }): void;
  drawCircle(run: Required<ShapeRun> & { cx: number; cy: number; r: number }): void;
  drawImage(run: Required<ShapeRun> & { x: number; y: number; w: number; h: number; data?: string | null }): void;
  drawIcon(run: Required<ShapeRun> & { x: number; y: number; w: number; h: number }): void;
  // Optional helpers
  textWidth?(text: string, fontName: string, fontSize: number): number;
  lineHeightFor?(fontSize: number): number;
};

/* ---------------------- utilities ---------------------- */

/** Normalize first arg so we can accept either {content} or {template: {content}} */
function getTemplateContent(input: any): any[] {
  if (input && Array.isArray(input.content)) return input.content;
  if (input && input.template && Array.isArray(input.template.content)) return input.template.content;
  return [];
}
const isPct = (v: any) => typeof v === "string" && /^\d+(\.\d+)?%$/.test(v);
const pctToFloat = (v: string) => Math.max(0, Math.min(1, parseFloat(v) / 100));

function get(obj: AnyObject, path: string): any {
  if (!obj || !path) return undefined;
  const segs = path.split(".").filter(Boolean);
  let cur: any = obj;
  for (const s of segs) {
    if (cur == null) return undefined;
    cur = cur[s];
  }
  return cur;
}

function has(obj: AnyObject, path: string): boolean {
  const v = get(obj, path);
  return v !== undefined && v !== null && !(typeof v === "string" && v.trim() === "");
}

/** Resolves strings that look like "!ref colors.highlightColor" against defaults */
function resolveRefs<T = any>(val: T, ctx: RenderContext): T {
  if (typeof val === "string" && val.startsWith("!ref ")) {
    const path = val.slice(5).trim();
    return get({ ref: ctx.defaults }, `ref.${path}`) as any as T;
  }
  return val;
}

/** Evaluate condition string like "a,b,!c,+d" against {document, section, record, defaults} */
function evalCondition(expr: string | undefined, ctx: RenderContext): boolean {
  if (!expr || !expr.trim()) return true;
  const tokens = expr.split(",").map((t) => t.trim()).filter(Boolean);
  const resolve = (name: string): any => {
    // name may be "!ref x" (rare in conditions) or a dotted path
    if (name.startsWith("!ref ")) return resolveRefs(name, ctx);
    // precedence: record → section → document → defaults (for virtual flags like sectionsLeft)
    return (
      (ctx.record && get(ctx.record, name)) ??
      (ctx.section && get(ctx.section, name)) ??
      get(ctx.document, name) ??
      get(ctx.defaults, name)
    );
  };
  // For conditionAll: every token must be truthy. For conditionSome: any token truthy.
  // We’ll return the raw token states; caller decides ALL vs SOME.
  (evalCondition as any).lastTokens = tokens.map((raw) => {
    let invert = false, exists = false, key = raw;
    if (key.startsWith("!")) { invert = true; key = key.slice(1); }
    else if (key.startsWith("+")) { exists = true; key = key.slice(1); }
    const val = exists ? has({ record: ctx.record, section: ctx.section, document: ctx.document, defaults: ctx.defaults }, key) : !!resolve(key);
    return invert ? !val : !!val;
  });
  return true;
}

function passAll(expr: string | undefined, ctx: RenderContext): boolean {
  if (!expr) return true;
  evalCondition(expr, ctx);
  const states: boolean[] = (evalCondition as any).lastTokens ?? [];
  return states.length === 0 ? true : states.every(Boolean);
}
function passSome(expr: string | undefined, ctx: RenderContext): boolean {
  if (!expr) return true;
  evalCondition(expr, ctx);
  const states: boolean[] = (evalCondition as any).lastTokens ?? [];
  return states.length === 0 ? true : states.some(Boolean);
}

function asPlainText(v: any, joiner = ", "): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.filter(Boolean).map(asPlainText).join(joiner);
  if (typeof v === "object") return ""; // your original doesn’t stringify objects into text
  return String(v);
}

/* ---------------------- columns placement ---------------------- */

type PlacedCol = { x: number; w: number; raw: ColumnSpec };

function placeColumns(cols: ColumnSpec[], backend: Backend): PlacedCol[] {
  const frame = backend.getFrame();
  const innerW = frame.w;
  let fixed = 0, pct = 0, flexCount = 0;
  cols.forEach((c) => {
    const w = c.width;
    if (typeof w === "number") fixed += w;
    else if (isPct(w)) pct += pctToFloat(w as string) * innerW;
    else flexCount += 1; // "max" or undefined
  });
  const remaining = Math.max(0, innerW - fixed - pct);
  const flexW = flexCount > 0 ? remaining / flexCount : 0;

  let x = frame.x;
  const out: PlacedCol[] = cols.map((c) => {
    let w: number;
    if (typeof c.width === "number") w = c.width;
    else if (isPct(c.width)) w = pctToFloat(c.width as string) * innerW;
    else w = flexW;
    const cur = { x, w, raw: c };
    x += w;
    return cur;
  });

  // keep last column flush with right edge
  const overshoot = out.length ? (out[out.length - 1].x + out[out.length - 1].w) - (frame.x + innerW) : 0;
  if (Math.abs(overshoot) > 0.5 && out.length) {
    out[out.length - 1].w -= overshoot;
  }
  return out;
}

/* ---------------------- main walker ---------------------- */

export type RenderOptions = {
  /** If provided, called for decoration render types (progress bars, five/ten circles, etc.) */
  drawDecoration?: (kind: string, run: TextRun, backend: Backend) => void;
  /** Optional hook to filter which sections to show (matches how your app configures left/right lists) */
  filterSection?: (section: AnyObject, ctx: RenderContext) => boolean;
};

export async function renderTemplate(
  templateOrWrapper: { content?: TemplateNode[]; template?: { content?: TemplateNode[]; version?: string }; version?: string },
  defaults: AnyObject,
  documentData: AnyObject,
  backend: Backend,
  opts: RenderOptions = {}
) {
  const rootCtx: RenderContext = { document: documentData || {}, defaults: defaults || {}, vars: {} };
  const templateContent = getTemplateContent(templateOrWrapper);
  if (!Array.isArray(templateContent) || templateContent.length === 0) {
    // nothing to render; exit cleanly
    return;
  }

  async function visit(node: TemplateNode, ctx: RenderContext): Promise<void> {
    // conditions
    const condAll = node.conditionAll ? passAll(node.conditionAll, ctx) : true;
    const condSome = node.conditionSome ? passSome(node.conditionSome, ctx) : true;
    if (!condAll || !condSome) return;

    // margins → push frame
    const mTop = node.marginTop ?? 0;
    const mRight = node.marginRight ?? 0;
    const mBottom = node.marginBottom ?? 0;
    const mLeft = node.marginLeft ?? 0;
    if (mTop || mRight || mBottom || mLeft) {
      const fr = backend.getFrame();
      backend.pushFrame({
        x: fr.x + mLeft,
        y: fr.y + mTop,
        w: Math.max(0, fr.w - mLeft - mRight),
        h: Math.max(0, fr.h - mTop - mBottom),
      });
    }

    // background first
    if (Array.isArray(node.background)) {
      for (const s of node.background) await drawShape(s, ctx);
    }

    // switch
    if (Array.isArray(node.switch) && node.switch.length) {
      for (const branch of node.switch) {
        const okAll = branch.conditionAll ? passAll(branch.conditionAll, ctx) : true;
        const okSome = branch.conditionSome ? passSome(branch.conditionSome, ctx) : true;
        if (okAll && okSome) {
          await visit({ ...branch }, ctx);
          break;
        }
      }
      // after switch, continue to allow siblings (like shape/text) on this node too
    }

    // columns
    if (Array.isArray(node.columns) && node.columns.length) {
      const placed = placeColumns(node.columns, backend);
      for (const col of placed) {
        backend.pushFrame({ x: col.x, y: backend.getFrame().y, w: col.w, h: backend.getFrame().h });
        if (Array.isArray(col.raw.content)) {
          for (const child of col.raw.content) await visit(child, ctx);
        }
        backend.popFrame();
      }
    }

    // valueKey scoping (sections / records repeaters)
    if (node.valueKey === "sections") {
      const list: AnyObject[] = Array.isArray(ctx.document?.sections) ? ctx.document.sections : [];
      for (const section of list) {
        if (opts.filterSection && !opts.filterSection(section, ctx)) continue;
        const subCtx: RenderContext = { ...ctx, section, record: null };
        if (Array.isArray(node.content)) {
          for (const child of node.content) await visit(child, subCtx);
        }
      }
    } else if (node.valueKey === "records") {
      const recs: AnyObject[] = Array.isArray(ctx.section?.records) ? ctx.section!.records : [];
      for (const record of recs) {
        const subCtx: RenderContext = { ...ctx, record };
        if (Array.isArray(node.content)) {
          for (const child of node.content) await visit(child, subCtx);
        }
      }
    } else {
      // draw text runs (immediate)
      if (Array.isArray(node.text)) {
        for (const t of node.text) await drawText(t, ctx, backend, opts);
      }
      // shapes (immediate)
      if (Array.isArray(node.shape)) {
        for (const s of node.shape) await drawShape(s, ctx);
      }
      // children
      if (Array.isArray(node.content)) {
        for (const child of node.content) await visit(child, ctx);
      }
    }

    if (mTop || mRight || mBottom || mLeft) backend.popFrame();
  }

  async function drawText(run: TextRun, ctx: RenderContext, backend: Backend, options: RenderOptions) {
    const frame = backend.getFrame();
    // Resolve content
    let raw: any = "";
    if (run.valueKey) {
      raw =
        (ctx.record && getFromScopes(ctx, run.valueKey)) ??
        (ctx.section && getFromScopes(ctx, run.valueKey)) ??
        getFromScopes({ ...ctx, record: undefined, section: undefined }, run.valueKey);
    } else if (run.value != null) {
      raw = run.value;
    }

    // Convert arrays to text when "lineBreakToText" is provided (e.g., address array)
    if (Array.isArray(raw) && run.lineBreakToText) raw = raw.filter(Boolean).join(run.lineBreakToText);
    const txt = asPlainText(raw);

    const fontName = String(resolveRefs(run.fontName, ctx) ?? "Arial");
    const fontSize = Number(resolveRefs(run.fontSize, ctx) ?? 10);
    const color = String(resolveRefs(run.color, ctx) ?? "#000");
    const align = (run.align ?? "left") as "left" | "center" | "right";
    const lh = run.lineHeight ?? (backend.lineHeightFor ? backend.lineHeightFor(fontSize) : Math.round(fontSize * 1.25));

    // y offset using "top" for the first baseline
    const y = frame.y + (run.top ?? 0);
    const maxWidth = frame.w;

    // measure to handle align
    let x = frame.x;
    if (align !== "left" && backend.textWidth) {
      const w = backend.textWidth(txt, fontName, fontSize);
      if (align === "center") x = frame.x + (maxWidth - w) / 2;
      if (align === "right") x = frame.x + (maxWidth - w);
    }

    backend.drawText({
      valueKey: null,
      value: txt,
      type: "singleline",
      color,
      fontName,
      fontSize,
      fontStyle: (run.fontStyle ?? "normal"),
      align,
      lineHeight: lh,
      top: 0,
      bottom: 0,
      decoration: run.decoration ?? {},
      lineBreakToText: undefined,
      x,
      y,
      maxWidth,
    });

    // simple “decoration hook” (e.g., progress bars or circles)
    if (run.decoration && options.drawDecoration) {
      const kind = String(run.decoration.type || "");
      options.drawDecoration(kind, run, backend);
    }
  }

  async function drawShape(s: ShapeRun, ctx: RenderContext) {
    const frame = backend.getFrame();
    const kind = s.type;
    const color = String(resolveRefs(s.color, ctx) ?? "#000");

    if (kind === "rect") {
      const w = s.width === "max" ? frame.w : (s.width ?? 0);
      const h = s.height === "max" ? frame.h : (s.height ?? 0);
      const x = frame.x + (s.left ?? 0);
      const y = frame.y + (s.top ?? 0);
      backend.drawRect({ ...s, type: "rect", color, x, y, w, h });
      return;
    }

    if (kind === "circle") {
      const r = typeof s.radius === "number" ? s.radius : 20;
      const cx = frame.x + (s.left ?? 0) + r;
      const cy = frame.y + (s.top ?? 0) + r;
      backend.drawCircle({ ...s, type: "circle", color, cx, cy, r });
      return;
    }

    if (kind === "image" || kind === "transparentImage") {
      const w = s.width === "max" ? frame.w : (s.width ?? 0);
      const h = s.height === "max" ? frame.h : (s.height ?? 0);
      const x = frame.x + (s.left ?? 0);
      const y = frame.y + (s.top ?? 0);
      const data = s.valueKey ? getFromScopes(ctx, s.valueKey) : undefined;
      backend.drawImage({ ...s, type: kind, color, x, y, w, h, data });
      return;
    }

    if (kind === "icon") {
      // You can translate icon names to your icon set in the backend
      const w = s.width === "max" ? 12 : (s.width ?? 12);
      const h = w;
      const x = frame.x + (s.left ?? 0);
      const y = frame.y + (s.top ?? 0);
      backend.drawIcon({ ...s, type: "icon", color, x, y, w, h });
      return;
    }
  }

  function getFromScopes(ctx: RenderContext, key: string): any {
    // Try record.fields.* first (CVWizard’s records store values under fields.*)
    if (key.startsWith("fields.")) {
      const k = key.slice(7);
      const recVals = (ctx.record?.values ?? []) as any[];
      // In many templates, fields are resolved by name via the node structure, but
      // when key is explicit, you may map section schema to positions; for now, try record.fields
      const recObj = ctx.record as any;
      const viaObj = recObj?.fields ? recObj.fields[k] : undefined;
      if (viaObj !== undefined) return viaObj;
      // Fallback: allow direct dotted path on record
      const asPath = get(ctx.record || {}, key);
      if (asPath !== undefined) return asPath;
    }

    // Plain dotted lookups: record → section → document
    const fromRec = ctx.record ? get(ctx.record, key) : undefined;
    if (fromRec !== undefined) return fromRec;
    const fromSec = ctx.section ? get(ctx.section, key) : undefined;
    if (fromSec !== undefined) return fromSec;
    const fromDoc = get(ctx.document, key);
    if (fromDoc !== undefined) return fromDoc;

    // !ref fallback
    if (key.startsWith("!ref ")) return resolveRefs(key, ctx);
    return undefined;
  }

  // Kick off
  backend.pushFrame({ x: backend.getFrame().x, y: backend.getFrame().y, w: backend.getFrame().w, h: backend.getFrame().h });
  for (const node of templateContent) await visit(node, rootCtx);
  backend.popFrame();
}
