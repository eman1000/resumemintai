import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export type Run = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  link?: string | null;
};

export type RecordItem = {
  header?: string;
  subheader?: string;
  period?: string;
  value?: string;
  richtextValue?: string;
  bullets?: string[];
  bulletsHtml?: string[];
  pdKey?: string;
  iconHref?: string;
  listType?: 'ol'|'ul';
  level?: string;           // 👈 NEW
};
export type Section = { key: string; title?: string; records?: RecordItem[] };
export type Box = { x: number; y: number; w: number; h: number };


export function parseInlineHtml(html?: string): Run[] {
  if (!html) return [];
  let s = String(html)
    .replace(/\r/g, "")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "<br>")
    .replace(/<\s*br\s*\/?\s*>/gi, "<br>")
    .replace(/<\s*(p|div|ul|ol|li|h[1-6])[^>]*>/gi, "");

  s = s
    .replace(/<span[^>]*style="[^"]*font-weight\s*:\s*(bold|700)[^"]*"[^>]*>/gi, "<strong>")
    .replace(/<span[^>]*style="[^"]*font-style\s*:\s*italic[^"]*"[^>]*>/gi, "<em>")
    .replace(/<span[^>]*style="[^"]*text-decoration[^"]*underline[^"]*"[^>]*>/gi, "<u>")
    .replace(/<span[^>]*style="[^"]*(line-through|strike)[^"]*"[^>]*>/gi, "<strike>")
    .replace(/<\/span>/gi, "")
    .replace(/<(?!\/?(b|strong|i|em|u|s|strike|a)\b|br\b)[^>]*>/gi, "");

  const tagRe = /<(\/)?(b|strong|i|em|u|s|strike|a)(?:\s+href="([^"]*)")?\s*>|<br\s*\/?>/gi;

  const stack: Array<Partial<Run>> = [];
  const runs: Run[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  const curStyle = () => stack.reduce((acc, it) => ({ ...acc, ...it }), {} as Partial<Run>);
  const emitText = (text: string) => {
    if (!text) return;
    runs.push({ text, ...curStyle() });
  };

  while ((m = tagRe.exec(s))) {
    if (m.index > lastIdx) emitText(s.slice(lastIdx, m.index));
    lastIdx = tagRe.lastIndex;

    const raw = m[0];
    const [, closing, tag, href] = m;

    // <br>
    if (/^<br\b/i.test(raw)) {
      emitText("\n");
      continue;
    }

    const t = String(tag || "").toLowerCase();

    // flush BEFORE changing styles so previous text keeps its style
    if (!closing) {
      if (t === "b" || t === "strong") stack.push({ bold: true });
      else if (t === "i" || t === "em") stack.push({ italic: true });
      else if (t === "u") stack.push({ underline: true });
      else if (t === "s" || t === "strike") stack.push({ strike: true });
      else if (t === "a") stack.push({ link: href || "" });
    } else {
      // closing: pop the latest of the same type
      for (let i = stack.length - 1; i >= 0; i--) {
        const st = stack[i];
        const match =
          (t === "b" || t === "strong") ? st.bold :
          (t === "i" || t === "em")     ? st.italic :
          (t === "u")                   ? st.underline :
          (t === "s" || t === "strike") ? st.strike :
          (t === "a")                   ? ("link" in st) :
          false;
        if (match) { stack.splice(i, 1); break; }
      }
    }
  }

  // tail
  if (lastIdx < s.length) emitText(s.slice(lastIdx));
  return runs;
}

export function paragraphRich(
  html: string | undefined,
  maxW: number,
  styleObj: { x: number; body: number; text: string; family: string; linkColor?: string; },
  push: (node: React.ReactNode) => void,
  need: (px: number) => boolean,
  lineH: number,
  cursorRef: { y: number },
  paraGap: number
) {
  if (!html) return true;

  const BULLET_INDENT = 16;  // text start
  const BULLET_GAP    = 6;   // bullet->text gap
  const BULLET_R      = 2;   // bullet radius

  const hasList = /<(ul|ol)\b/i.test(html);

  if (hasList) {
    // Render each LI
    const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
    let m: RegExpExecArray | null;
    while ((m = liRe.exec(html))) {
      const liHtml = m[1] || "";

      // bullet glyph
      if (!need(lineH)) return false;
      push(
        <circle
          key={`li-b-${cursorRef.y}`}
          cx={styleObj.x + BULLET_INDENT - BULLET_GAP}
          cy={cursorRef.y - 3 + styleObj.body}
          r={BULLET_R}
          fill={styleObj.text}
        />
      );

      // list item text (with inline styles)
      const liRuns = parseInlineHtml(liHtml);
      const liWrapped = wrapRichLines(liRuns, maxW - BULLET_INDENT, styleObj.body);

      for (const runLine of liWrapped) {
        if (!need(lineH)) return false;
        push(
          <text
            key={`li-t-${cursorRef.y}-${Math.random().toString(36).slice(2,8)}`}
            x={styleObj.x + BULLET_INDENT}
            y={cursorRef.y}
            fontFamily={styleObj.family}
            fontSize={`${styleObj.body}px`}
            fill={styleObj.text}
          >
            {runLine.map((r, i) => (
              <tspan
                key={i}
                style={{
                  fontWeight: r.bold ? 700 : 400,
                  fontStyle: r.italic ? "italic" : "normal",
                  textDecoration: `${r.underline ? "underline " : ""}${r.strike ? "line-through" : ""}`.trim() || "none",
                }}
                fill={r.link ? (styleObj.linkColor || styleObj.text) : styleObj.text}
              >
                {r.text}
              </tspan>
            ))}
          </text>
        );
        cursorRef.y += lineH;
      }
    }
    // gap after the list
    cursorRef.y += paraGap;
    return true;
  }

  // No list → treat as paragraphs with inline styles
  const normalized = String(html)
    .replace(/\r/g, "")
    .replace(/<\/(p|div|h[1-6])>/gi, "\n\n")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n");

  const blocks = normalized.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);

  for (const block of blocks) {
    const runs = parseInlineHtml(block);
    const wrapped = wrapRichLines(runs, maxW, styleObj.body);
    for (const runLine of wrapped) {
      if (!need(lineH)) return false;
      push(
        <text
          key={`p-${cursorRef.y}-${Math.random().toString(36).slice(2,8)}`}
          x={styleObj.x}
          y={cursorRef.y}
          fontFamily={styleObj.family}
          fontSize={`${styleObj.body}px`}
          fill={styleObj.text}
        >
          {runLine.map((r, i) => (
            <tspan
              key={i}
              style={{
                fontWeight: r.bold ? 700 : 400,
                fontStyle: r.italic ? "italic" : "normal",
                textDecoration: `${r.underline ? "underline " : ""}${r.strike ? "line-through" : ""}`.trim() || "none",
              }}
              fill={r.link ? (styleObj.linkColor || styleObj.text) : styleObj.text}
            >
              {r.text}
            </tspan>
          ))}
        </text>
      );
      cursorRef.y += lineH;
    }
    cursorRef.y += paraGap;
  }
  return true;
}

export function wrapLines(s: string, maxW: number, size: number) {
  const words = String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  const lines: string[] = [];
  let cur = "";

  for (const w of words) {
    const t = cur ? cur + " " + w : w;

    if (approx(t, size) <= maxW) {
      cur = t;
      continue;
    }

    // push the current line if any
    if (cur) lines.push(cur);

    // break the overlong token into wrapped chunks
    const chunks = breakLongToken(w, maxW, size);
    // all full chunks become full lines except the last (which becomes the new cur)
    for (let i = 0; i < chunks.length - 1; i++) lines.push(chunks[i]);
    cur = chunks[chunks.length - 1];
  }

  if (cur) lines.push(cur);
  return lines;
}

const BREAK_CHARS = "/.-_?&=#";


export const approx = (s: string, px: number) => s.length * px * 0.55;
export function breakLongToken(word: string, maxW: number, size: number): string[] {
  if (approx(word, size) <= maxW) return [word];

  const lines: string[] = [];
  let s = word;

  // a rough upper bound per line using your approx() heuristic
  const charsPerLine = Math.max(1, Math.floor(maxW / (size * 0.55)));

  while (s.length) {
    // optimistic cut
    let cut = Math.min(s.length, charsPerLine);

    // prefer to cut at a break char within the window (scan backwards)
    let niceCut = -1;
    for (let i = cut; i >= 1; i--) {
      if (BREAK_CHARS.includes(s[i - 1])) { niceCut = i; break; }
    }
    if (niceCut > 0) cut = niceCut;

    // ensure we don't exceed maxW (approx is monotonic with length)
    while (cut > 1 && approx(s.slice(0, cut), size) > maxW) cut--;

    lines.push(s.slice(0, cut));
    s = s.slice(cut);
  }

  return lines;
}

export function wrapRichLines(runs: Run[], maxW: number, size: number) {
  const lines: Run[][] = [];
  let cur: Run[] = [];

  const lineText = () => cur.map(r => r.text).join("");

  const pushToken = (token: string, style: Partial<Run>) => {
    const candidate = (lineText() + (cur.length ? " " : "") + token);
    if (approx(candidate, size) <= maxW) {
      if (cur.length) cur.push({ text: " " });
      cur.push({ text: token, ...style });
      return;
    }
    // need a new line
    if (cur.length) lines.push(cur), cur = [];

    // if a single token is too long, hard-break it
    const chunks = breakLongToken(token, maxW, size);
    for (let i = 0; i < chunks.length; i++) {
      const ch = chunks[i];
      // each chunk either fills a new line or continues the current one (which is empty here)
      cur.push({ text: ch, ...style });
      if (i < chunks.length - 1) {
        lines.push(cur);
        cur = [];
      }
    }
  };

  for (const r of runs) {
    if (r.text === "\n") {
      if (cur.length) lines.push(cur), cur = [];
      continue;
    }
    const words = r.text.split(/\s+/).filter(Boolean);
    for (const w of words) {
      pushToken(w, {
        bold: !!r.bold,
        italic: !!r.italic,
        underline: !!r.underline,
        strike: !!r.strike,
        link: r.link ?? undefined,
      });
    }
  }
  if (cur.length) lines.push(cur);
  return lines;
}


export const T: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
  family: string;
  weight?: 400 | 700;
  anchor?: "start" | "middle" | "end";
  children: React.ReactNode;
}> = ({ x, y, size, color, family, weight = 400, anchor = "start", children }) => (
  <text
    x={x}
    y={y}
    textAnchor={anchor}
    fontFamily={family}
    fontSize={`${size}px`}
    fill={color}
    style={{ fontWeight: weight as any }}
  >
    {children}
  </text>
);


export const R: React.FC<{ x: number; y: number; w: number; h: number; fill: string; rx?: number }> =
  ({ x, y, w, h, fill, rx }) => <rect x={x} y={y} width={w} height={h} fill={fill} rx={rx} />;

export function renderFAIcon(icon: IconDefinition, x: number, y: number, targetW: number, targetH: number, fill: string) {
  // FA tuple: [width, height, aliases, unicode, svgPathData]
  const [iw, ih, , , pathDataRaw] = icon.icon;
  const pathData = Array.isArray(pathDataRaw) ? pathDataRaw.join(" ") : pathDataRaw;

  // scale to fit target box; keep aspect ratio
  const s = Math.min(targetW / iw, targetH / ih);
  const scaledW = iw * s;
  const scaledH = ih * s;

  // center within target box
  const tx = x + (targetW - scaledW) / 2;
  const ty = y + (targetH - scaledH) / 2;

  return (
    <g transform={`translate(${tx},${ty}) scale(${s})`}>
      <path d={pathData} fill={fill} />
    </g>
  );
}

const titleCase = (s: string) =>
  String(s || "").replace(/[-_]/g, " ").replace(/\b\w/g, m => m.toUpperCase());

export function pourSectionsPaged(
  firstBox: Box,
  followBox: Box,
  sections: Section[],
  style: {
    family: string;
    body: number;
    line: number;
    section: number;
    primary: string;
    text: string;
    header: string;
    divider: string;
  },
  opts: {
    bulletsForKeys?: string[]; // lowercase section keys that get bullets when no explicit bullets[]
    gaps: { para: number; header: number; title: number; section: number; record: number; beforeTitlePad: number };
    rail?: boolean;
   leadingIcon?: (sectionKey: string, rec: RecordItem, recIdx: number) => IconDefinition | undefined;

  }
) {
  const bulletKeys = new Set((opts.bulletsForKeys || []).map(k => k.toLowerCase()));
  const g = opts.gaps;

  let pageIdx = 0;
  let pageElements: React.ReactNode[] = [];
  const pages: React.ReactNode[][] = [pageElements];

  let box = { ...firstBox };
  let cursor = box.y + g.beforeTitlePad;

  const onNewPage = () => {
    pageIdx += 1;
    pageElements = [];
    pages.push(pageElements);
    box = { ...followBox };
    cursor = box.y;
  };

  const within = (px: number) => cursor + px <= box.y + box.h;
  const push = (node: React.ReactNode) => pageElements.push(node);

  const need = (px: number) => {
    if (within(px)) return true;
    // Rail previously refused to paginate → overflow got dropped.
    // Allow pagination so remaining records go to the next page(s).
    onNewPage();
    return within(px);
  };

  // write a single text line
  const line = (
    s: string,
    size: number,
    color: string,
    weight: 400 | 700 = 400,
    anchor: "start" | "middle" | "end" = "start",
    x = box.x
  ) => {
    if (!s) return false;
    if (!need(style.line)) return false;
    push(
      <T key={`pg${pageIdx}-t${pageElements.length}`} x={x} y={cursor} size={size} color={color} family={style.family} weight={weight} anchor={anchor}>
        {s}
      </T>
    );
    cursor += style.line;
    return true;
  };

  // write wrapped lines with custom max width & weight
  const linesWrapped = (
    s: string,
    maxW: number,
    size: number,
    color: string,
    weight: 400 | 700 = 400,
    x = box.x
  ) => {
    if (!s) return false;
    const parts = wrapLines(s, maxW, size);
    for (const ln of parts) {
      if (!need(style.line)) return false;
      push(
        <T key={`pg${pageIdx}-tw${pageElements.length}`} x={x} y={cursor} size={size} color={color} family={style.family} weight={weight}>
          {ln}
        </T>
      );
      cursor += style.line;
    }
    return true;
  };

  const divider = () => {
    push(
      <path
        key={`pg${pageIdx}-div${pageElements.length}`}
        d={`M ${box.x} ${cursor - style.line + 8} L ${box.x + box.w} ${cursor - style.line + 8}`}
        fill="none"
        stroke={style.divider}
        strokeWidth="0.75"
      />
    );
  };

  const paragraph = (s?: string, indent = 0) => {
    if (!s) return true;
    const maxW = box.w - indent;
    const lines = wrapLines(s, maxW, style.body);
    for (let i = 0; i < lines.length; i++) {
      if (!need(style.line)) return false;
      push(
        <T key={`pg${pageIdx}-p${pageElements.length}`} x={box.x + indent} y={cursor} size={style.body} color={style.text} family={style.family}>
          {lines[i]}
        </T>
      );
      cursor += style.line;
    }
    cursor += g.para;
    return true;
  };

  /** pour */
  for (const sec of sections) {
    const key = (sec.key || "").toLowerCase();
    const defaultBullets = bulletKeys.has(key);

    if (!need(style.line * 2)) {
      if (opts.rail) break;
    }
    const title = sec.title ?? titleCase(sec.key);
    if (!line(title, style.section, style.primary, 700)) break;
    divider();
    cursor += g.title;

    if (sec.records?.length) {
      for (let rIdx = 0; rIdx < sec.records.length; rIdx++) {
        const rec = sec.records[rIdx];
    
        const strip = (h?: string) => String(h || "").replace(/<[^>]+>/g, "").trim();
        const hasMain =
          !!(
            (rec.header && rec.header.trim()) ||
            (rec.subheader && rec.subheader.trim()) ||
            (rec.value && rec.value.trim()) ||
            strip(rec.richtextValue) ||
            (rec.bullets && rec.bullets.some(b => String(b).trim())) ||
            (rec.bulletsHtml && rec.bulletsHtml.some(b => strip(b)))
          );

        if (!hasMain) {
          // nothing meaningful to show on the left → do NOT render period either
          continue;
        }

        // ask for icon (if any)
        const iconDef = opts.leadingIcon?.(key, rec, rIdx);

        // icon metrics + gutter
        const ICON_W = 13.125;
        const ICON_H = 15;
        const ICON_LEFT_PAD = 6;   // slightly more left padding
        const ICON_GAP = 8;        // a bit more breathing room
        const ICON_BASELINE_ADJ = 0.40; // <-- controls vertical alignment vs. text baseline


        // icon box width (left gutter) if present
        const iconBox = iconDef ? (ICON_LEFT_PAD + ICON_W + ICON_GAP) : 0;


        // Compute room for right-aligned period (based on approx width)
        const period = rec.period ?? "";
        const periodW = period ? approx(period, style.body) + 10 : 0; // pad
        const headerMaxW = box.w - periodW - iconBox - 4;

        const headerText = iconDef
          ? String(rec.header || "").replace(/^\s*[^:]+:\s*/, "").trim()
          : rec.header || "";

          if (!within(style.line)) onNewPage();

        const headerStartY = cursor;

        // draw icon (aligned to first header line baseline)
            if (iconDef && need(style.line)) {
              // align to the first header line baseline, like before
              const ix = box.x + ICON_LEFT_PAD;
              const iy = headerStartY - ICON_H + style.body * ICON_BASELINE_ADJ;
              push(
                <g key={`pg${pageIdx}-ico${pageElements.length}`}>
                  {renderFAIcon(iconDef, ix, iy, ICON_W, ICON_H, style.primary)}
                </g>
              );
            }

    

        // draw period aligned to first header line
        if (period) {
          push(
            <T
              key={`pg${pageIdx}-per${pageElements.length}`}
              x={box.x + box.w}
              y={headerStartY}
              size={style.body}
              color={style.header}
              family={style.family}
              anchor="end"
              weight={700}
            >
              {period}
            </T>
          );
        }


        if (headerText) {
          linesWrapped(
              headerText,
              Math.max(30, headerMaxW),
              style.body,
              style.header,
              700,
              box.x + iconBox           // <-- shift text start
          );
        }
        // subheader (primary, wrapped full width)
        if (rec.subheader) {
          linesWrapped(
              rec.subheader,
              box.w - iconBox,
              style.body,
              style.primary,
              400,
              box.x + iconBox           // <-- shift text start
          );
        }
// inside pourSectionsPaged(), in the records loop (right after subheader block)

// helper once:
  const levelToSteps = (v: any, which: "skills" | "languages") => {
    const s = String(v ?? "").trim().toLowerCase();
    if (!s) return 0;
    const n = parseInt(s, 10);
    if (!Number.isNaN(n)) return Math.max(0, Math.min(5, n));

    // text labels → 1..5
    if (which === "languages") {
      if (s.startsWith("basic") || s.startsWith("elementary")) return 2;
      if (s.startsWith("conv") || s.startsWith("working"))     return 3;
      if (s.startsWith("fluent") || s.startsWith("prof"))      return 4;
      if (s.startsWith("native") || s.startsWith("biling"))    return 5;
      return 0;
    }
    // skills
    if (s.startsWith("beg")) return 1;
    if (s.startsWith("mod")) return 2;
    if (s.startsWith("int") || s.startsWith("good")) return 3;
    if (s.startsWith("very") || s.startsWith("adv")) return 4;
    if (s.startsWith("exc") || s.startsWith("exp"))  return 5;
    return 0;
  };

  // draw dots for both sections
  const renderLevelDots = (steps: number) => {
    const DOTS = 5, R = 3.75, GAP = 10;
    const totalW = (DOTS - 1) * GAP;
    const right = box.x + box.w;
    const startX = right - totalW - 12;
    const cy = headerStartY - (style.line - style.body) / 7;
    for (let d = 0; d < DOTS; d++) {
      push(
        <circle
          key={`pg${pageIdx}-lvldot-${pageElements.length}-${d}`}
          cx={startX + d * GAP}
          cy={cy}
          r={R}
          fill={d < steps ? style.primary : "#c4c5c7"}
        />
      );
    }
  };


  if ((key === "skills" || key === "languages") && rec.level) {
      console.log("key:", key);
  console.log("rec.level:", rec.level);
    const steps = levelToSteps(rec.level, key as "skills" | "languages");
    if (steps > 0) renderLevelDots(steps);
  }




  cursor += g.header;

  

  // bullets (explicit) > fallback (section-level bullets) > paragraph
  // bullets (explicit) > fallback (section-level bullets) > paragraph
if ((rec.bulletsHtml && rec.bulletsHtml.length) || (rec.bullets && rec.bullets.length)) {
  const items = (rec.bulletsHtml && rec.bulletsHtml.length)
    ? rec.bulletsHtml          // HTML items → keep inline formatting
    : rec.bullets!;            // plain text (legacy)

  const BULLET_INDENT = 16;
      const BULLET_RADIUS = 2.2;

      items.forEach((item, idx) => {
        if (!need(style.line)) { if (opts.rail) return; }

        // marker (number or dot)
        const baseline = cursor - (style.line - style.body) / 7;
        const cy = baseline - style.body * 0.22;
        const gutterX = box.x + BULLET_INDENT - 6;

        if (rec.listType === "ol") {
          // "1." numbers
          push(
            <T
              key={`pg${pageIdx}-num${pageElements.length}`}
              x={box.x}
              y={baseline}
              size={style.body}
              color={style.text}
              family={style.family}
            >
              {`${idx + 1}.`}
            </T>
          );
    } else {
      // dot bullet
      push(
        <circle
          key={`pg${pageIdx}-dot${pageElements.length}`}
          cx={gutterX}
          cy={cy}
          r={BULLET_RADIUS}
          fill={style.text}
        />
      );
    }

    // item text → use paragraphRich to keep <b>/<i>/<u>/<a>
    const cursorRef = { y: cursor };
    const ok = paragraphRich(
      item,                             // HTML
      box.w,                            // max width
      { x: box.x + BULLET_INDENT, body: style.body, text: style.text, family: style.family, linkColor: style.primary },
      push, need, style.line, cursorRef,
      g.para
    );
    cursor = cursorRef.y;
    if (!ok) { if (opts.rail) return; }
  });
    } else {
      const txt = rec.value ?? rec.richtextValue;
      if (txt) {
        if (defaultBullets) {
          // legacy fallback
          if (!need(style.line)) { if (opts.rail) break; }
          push(<circle key={`pg${pageIdx}-b${pageElements.length}`} cx={box.x + 3} cy={cursor - 3 + style.body} r={2} fill={style.text} />);
          if (!paragraph(txt, 12)) { if (opts.rail) break; }
        } else {
          const cursorRef = { y: cursor };
          const ok = paragraphRich(
            txt,
            box.w,
            { x: box.x, body: style.body, text: style.text, family: style.family, linkColor: style.primary },
            push, need, style.line, cursorRef,
            g.para
          );
          cursor = cursorRef.y;
          if (!ok) { if (opts.rail) break; }
        }
      }
    }


        if (rIdx < sec.records.length - 1) cursor += g.record;
      }
    }

    cursor += g.section;
  }

  return pages;
}