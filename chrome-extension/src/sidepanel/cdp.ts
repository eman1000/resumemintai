// chrome.debugger (Chrome DevTools Protocol) driver — TRUSTED input.
//
// This is what makes the agent work on ANY site, including ones that ignore
// synthetic JS events (Workday, custom React portals check event.isTrusted).
// We attach the debugger to the tab, then dispatch real mouse/keyboard
// events via Input.* and screenshot via Page.captureScreenshot. Chrome shows
// the unavoidable "ResumeMint Apply started debugging this browser" banner
// while attached; we detach when the run ends.

export type ComputerAction =
  | { action: "screenshot" }
  | { action: "left_click"; coordinate: [number, number]; text?: string }
  | { action: "right_click"; coordinate: [number, number] }
  | { action: "middle_click"; coordinate: [number, number] }
  | { action: "double_click"; coordinate: [number, number] }
  | { action: "triple_click"; coordinate: [number, number] }
  | { action: "mouse_move"; coordinate: [number, number] }
  | { action: "left_click_drag"; start_coordinate: [number, number]; coordinate: [number, number] }
  | { action: "left_mouse_down"; coordinate: [number, number] }
  | { action: "left_mouse_up"; coordinate: [number, number] }
  | { action: "type"; text: string }
  | { action: "key"; text: string }
  | { action: "hold_key"; text: string; duration: number }
  | { action: "scroll"; coordinate: [number, number]; scroll_direction: "up" | "down" | "left" | "right"; scroll_amount: number }
  | { action: "wait"; duration: number }
  | { action: "cursor_position" }
  // Set-of-marks (element-targeted) — reliable; preferred over coordinates.
  | { action: "click_element"; index: number }
  | { action: "type_in_element"; index: number; text: string }
  | { action: "select_option"; index: number; value: string }
  // Attach the user's ResumeMint resume PDF directly to the form's file
  // input — no native OS dialog. label hint optional ("resume"/"cover").
  | { action: "upload_resume"; label?: string };

const DEBUGGER_VERSION = "1.3";

export class CdpSession {
  tabId: number;
  attached = false;
  /** Max width of the image we send the model (keeps tokens + targeting sane). */
  displayW: number;
  displayH: number;
  /** Dimensions of the LAST image we actually sent the model (model aims in
   * this space). */
  private imgW = 0;
  private imgH = 0;
  /** CSS viewport size of the page (what CDP Input expects). Model coords are
   * mapped from imgW/imgH → cssW/cssH before dispatch. */
  private cssW = 0;
  private cssH = 0;
  /** The resume PDF to feed into native file choosers, set by the loop. */
  filePayload: { base64: string; filename: string } | null = null;
  private fileChooserArmed = false;

  constructor(tabId: number, displayW: number, displayH: number) {
    this.tabId = tabId;
    this.displayW = displayW;
    this.displayH = displayH;
  }

  async attach(): Promise<void> {
    if (this.attached) return;
    await chrome.debugger.attach({ tabId: this.tabId }, DEBUGGER_VERSION);
    this.attached = true;
    await this.send("Page.enable");
    await this.send("DOM.enable");
    await this.send("Runtime.enable");
    // Intercept native file choosers so resume upload "just works": when the
    // page opens a file dialog, we set the files via CDP instead of the OS
    // picker (which an extension can't otherwise drive).
    await this.send("Page.setInterceptFileChooserDialog", { enabled: true });
    chrome.debugger.onEvent.addListener(this.onEvent);
  }

  async detach(): Promise<void> {
    if (!this.attached) return;
    chrome.debugger.onEvent.removeListener(this.onEvent);
    try {
      await chrome.debugger.detach({ tabId: this.tabId });
    } catch {
      /* tab may be gone */
    }
    this.attached = false;
  }

  /** Point the session at a new tab (external-apply followed to a new tab). */
  async retarget(tabId: number): Promise<void> {
    if (tabId === this.tabId && this.attached) return;
    await this.detach();
    this.tabId = tabId;
    await this.attach();
  }

  private onEvent = (
    source: chrome.debugger.Debuggee,
    method: string,
    params?: any,
  ) => {
    if (source.tabId !== this.tabId) return;
    if (method === "Page.fileChooserOpened") {
      // Handle asynchronously; errors are swallowed (best-effort upload).
      void this.handleFileChooser(params);
    }
  };

  private async handleFileChooser(params: any): Promise<void> {
    if (!this.filePayload) return;
    try {
      // Write the PDF to a temp path the page can read. chrome.debugger can't
      // create OS files, so we use DOM.setFileInputFiles with a data approach:
      // CDP's setInterceptFileChooserDialog gives us the backendNodeId.
      const backendNodeId = params?.backendNodeId;
      if (backendNodeId == null) return;
      // We need a real file path. Use the downloads API to materialise the
      // PDF on disk, then point the input at it.
      const path = await this.materializeResume();
      if (!path) return;
      await this.send("DOM.setFileInputFiles", {
        files: [path],
        backendNodeId,
      });
      this.fileChooserArmed = false;
    } catch {
      /* best-effort */
    }
  }

  /** Save the resume PDF to the Downloads folder and return its absolute
   * path (DOM.setFileInputFiles needs a filesystem path). */
  private resumePath: string | null = null;
  private async materializeResume(): Promise<string | null> {
    if (this.resumePath) return this.resumePath;
    if (!this.filePayload) return null;
    const dataUrl = `data:application/pdf;base64,${this.filePayload.base64}`;
    const downloadId: number = await new Promise((resolve, reject) => {
      chrome.downloads.download(
        { url: dataUrl, filename: this.filePayload!.filename, conflictAction: "overwrite", saveAs: false },
        (id) => (chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(id!)),
      );
    });
    // Wait for completion and read the on-disk path.
    const path = await new Promise<string | null>((resolve) => {
      const check = () =>
        chrome.downloads.search({ id: downloadId }, (items) => {
          const it = items?.[0];
          if (it && it.state === "complete" && it.filename) resolve(it.filename);
          else if (it && it.state === "interrupted") resolve(null);
          else setTimeout(check, 200);
        });
      check();
    });
    this.resumePath = path;
    return path;
  }

  /** Interactive elements on the page, discovered fresh each turn. Index in
   * this array is the "mark" the model selects (set-of-marks). Rects are in
   * CSS px (viewport-relative). */
  marks: Array<{
    idx: number;
    /** Stable in-page stamp (data-rm-mark) for re-locating this element. */
    mid?: string;
    label: string;
    role: string;
    x: number;
    y: number;
    w: number;
    h: number;
    /** "select" for native dropdowns — the model must use select_option, not click. */
    kind?: string;
    /** Option texts for native <select> elements. */
    options?: string[];
  }> = [];

  /** Enumerate clickable/typeable elements (set-of-marks). Runs in the page
   * via Runtime.evaluate so it pierces shadow DOM and same-origin iframes,
   * returns viewport-relative CSS-px rects + a label/role for each. */
  async enumerateElements(): Promise<typeof this.marks> {
    const expression = `(() => {
      const out = [];
      const SEL = "a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=link], [role=checkbox], [role=radio], [role=combobox], [role=tab], [role=menuitem], [contenteditable=true], label, summary";
      const seen = new Set();
      function visible(el){
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) return null;
        if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return null;
        const s = getComputedStyle(el);
        if (s.visibility === "hidden" || s.display === "none" || s.opacity === "0") return null;
        return r;
      }
      function label(el){
        let t = (el.getAttribute("aria-label") || el.textContent || el.value || el.placeholder || el.getAttribute("title") || el.name || "").trim().replace(/\\s+/g, " ");
        if (!t && el.tagName === "INPUT") t = (el.type || "text") + " field";
        return t.slice(0, 80);
      }
      let counter = 0;
      function walk(root){
        let nodes;
        try { nodes = root.querySelectorAll(SEL); } catch(e){ return; }
        for (const el of nodes){
          if (seen.has(el)) continue; seen.add(el);
          const r = visible(el);
          if (!r) continue;
          const tag = el.tagName.toLowerCase();
          const isSelect = tag === "select";
          // Stamp a stable id so the executor can find this exact element
          // later (selects, type targets) regardless of re-layout.
          const mid = "m" + (counter++);
          try { el.setAttribute("data-rm-mark", mid); } catch(e){}
          const rec = {
            mid,
            label: label(el),
            role: el.getAttribute("role") || tag + (el.type ? ":"+el.type : ""),
            x: Math.round(r.left), y: Math.round(r.top),
            w: Math.round(r.width), h: Math.round(r.height),
          };
          if (isSelect) {
            rec.kind = "select";
            rec.options = Array.from(el.options || []).map(o => o.text.trim()).filter(Boolean).slice(0, 60);
          }
          out.push(rec);
        }
        // shadow roots
        root.querySelectorAll("*").forEach(el => { if (el.shadowRoot) walk(el.shadowRoot); });
      }
      walk(document);
      // same-origin iframes (offset by their frame rect)
      for (const f of document.querySelectorAll("iframe")){
        try {
          const doc = f.contentDocument; if (!doc) continue;
          const fr = f.getBoundingClientRect();
          const before = out.length;
          walk(doc);
          for (let i = before; i < out.length; i++){ out[i].x += Math.round(fr.left); out[i].y += Math.round(fr.top); }
        } catch(e){ /* cross-origin */ }
      }
      return out;
    })()`;
    try {
      const res = await this.send("Runtime.evaluate", {
        expression,
        returnByValue: true,
      });
      const raw = (res?.result?.value || []) as Array<any>;
      this.marks = raw.slice(0, 150).map((m, idx) => ({ idx, ...m }));
    } catch {
      this.marks = [];
    }
    return this.marks;
  }

  /** Fresh viewport-center coords for a stamped mark (scrolls it into view
   * first). Returns null if the element is gone. */
  private async freshCenter(mid: string): Promise<{ x: number; y: number } | null> {
    try {
      const res = await this.send("Runtime.evaluate", {
        expression: `(() => {
          const el = document.querySelector('[data-rm-mark="${mid}"]');
          if (!el) return null;
          el.scrollIntoView({ block: 'center', inline: 'center' });
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) };
        })()`,
        returnByValue: true,
      });
      return res?.result?.value || null;
    } catch {
      return null;
    }
  }

  /** Click the center of element #idx using trusted CDP input. */
  async clickElement(idx: number): Promise<{ ok: boolean; note?: string }> {
    const m = this.marks[idx];
    if (!m) return { ok: false, note: `no element #${idx}` };
    // Use fresh post-scroll coords when we have a stamped id (robust to
    // layout shifts); fall back to enumerated rect.
    const fresh = m.mid ? await this.freshCenter(m.mid) : null;
    const x = fresh ? fresh.x : m.x + m.w / 2;
    const y = fresh ? fresh.y : m.y + m.h / 2;
    if (this.filePayload) this.fileChooserArmed = true;
    await this.click(Math.round(x), Math.round(y), "left", 1);
    return { ok: true, note: `clicked #${idx} "${m.label}"` };
  }

  /** Focus element #idx and type into it (click center, select-all, type). */
  async typeInElement(idx: number, text: string): Promise<{ ok: boolean; note?: string }> {
    const m = this.marks[idx];
    if (!m) return { ok: false, note: `no element #${idx}` };
    const fresh = m.mid ? await this.freshCenter(m.mid) : null;
    const x = fresh ? fresh.x : m.x + m.w / 2;
    const y = fresh ? fresh.y : m.y + m.h / 2;
    await this.click(Math.round(x), Math.round(y), "left", 1);
    await this.pressKey("ctrl+a");
    await this.typeText(text);
    return { ok: true, note: `typed into #${idx} "${m.label}"` };
  }

  /** Grab the visible page text (for tailoring the resume to the job). */
  async getPageText(max = 6000): Promise<string> {
    try {
      const res = await this.send("Runtime.evaluate", {
        expression: `(document.body && document.body.innerText || "").slice(0, ${max})`,
        returnByValue: true,
      });
      return res?.result?.value || "";
    } catch {
      return "";
    }
  }

  /** Attach the user's resume PDF directly to the form's <input type=file>
   * via DOM.setFileInputFiles — NO native OS dialog. Finds the resume file
   * input (preferring one whose label/name/id mentions resume/cv), pierces
   * shadow DOM. This is the reliable upload path; the chooser-interception
   * is only a fallback. */
  async uploadResume(labelHint?: string): Promise<{ ok: boolean; note?: string }> {
    if (!this.filePayload) return { ok: false, note: "no resume loaded for this run" };
    const path = await this.materializeResume();
    if (!path) return { ok: false, note: "could not prepare the resume PDF" };
    const hint = JSON.stringify((labelHint || "resume").toLowerCase());
    // Resolve the best file input to an objectId (returnByValue:false).
    const objRes = await this.send("Runtime.evaluate", {
      expression: `(() => {
        const inputs = [];
        const walk = (root) => {
          root.querySelectorAll('input[type=file]').forEach(i => inputs.push(i));
          root.querySelectorAll('*').forEach(e => { if (e.shadowRoot) walk(e.shadowRoot); });
        };
        walk(document);
        if (!inputs.length) return null;
        const hint = ${hint};
        const ctx = (el) => {
          const id = (el.id||'') + ' ' + (el.name||'') + ' ' + (el.getAttribute('aria-label')||'');
          let p = el.parentElement, t = '';
          for (let i=0;i<3 && p;i++,p=p.parentElement) t += ' ' + (p.textContent||'').slice(0,120);
          return (id + ' ' + t).toLowerCase();
        };
        // Avoid cover-letter inputs when looking for the resume.
        const wantCover = hint.includes('cover');
        const match = inputs.find(i => { const c = ctx(i); return wantCover ? c.includes('cover') : (c.includes('resume') || c.includes('cv')); });
        return match || inputs.find(i => !i.disabled) || inputs[0];
      })()`,
      returnByValue: false,
    });
    const objectId = objRes?.result?.objectId;
    if (!objectId) return { ok: false, note: "no file input found on this page" };
    try {
      const node = await this.send("DOM.requestNode", { objectId });
      await this.send("DOM.setFileInputFiles", { files: [path], nodeId: node.nodeId });
      return { ok: true, note: `attached ${this.filePayload.filename}` };
    } catch (e: any) {
      return { ok: false, note: `attach failed: ${e?.message || e}` };
    }
  }

  /** Set a native <select> element's value DIRECTLY via the DOM. Native
   * selects open an OS-level dropdown that does NOT appear in screenshots and
   * can't be driven by clicks/keys — so we match the option by text and set
   * .value + dispatch change. This is the ONLY reliable way to handle them. */
  async selectOption(idx: number, value: string): Promise<{ ok: boolean; note?: string }> {
    const m = this.marks[idx];
    if (!m) return { ok: false, note: `no element #${idx}` };
    const want = JSON.stringify(value);
    const expression = `(() => {
      const el = document.querySelector('[data-rm-mark="${m.mid}"]');
      if (!el || el.tagName.toLowerCase() !== 'select') return { ok:false, note:'not a native select' };
      const want = ${want}.trim().toLowerCase();
      const opts = Array.from(el.options);
      // match: exact text, then startsWith, then includes, then value
      let opt = opts.find(o => o.text.trim().toLowerCase() === want)
        || opts.find(o => o.text.trim().toLowerCase().startsWith(want))
        || opts.find(o => o.text.trim().toLowerCase().includes(want))
        || opts.find(o => (o.value||'').trim().toLowerCase() === want);
      if (!opt) return { ok:false, note:'option not found: ' + ${want}, sample: opts.slice(0,8).map(o=>o.text) };
      el.value = opt.value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok:true, note:'selected ' + opt.text.trim() };
    })()`;
    try {
      const res = await this.send("Runtime.evaluate", { expression, returnByValue: true });
      const v = res?.result?.value || { ok: false, note: "eval failed" };
      return v;
    } catch (e: any) {
      return { ok: false, note: `select failed: ${e?.message || e}` };
    }
  }

  send(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({ tabId: this.tabId }, method, params || {}, (res) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(res);
      });
    });
  }

  /** Capture a screenshot and return base64 PNG (no data: prefix) for the
   * model. CRITICAL: on Retina/HiDPI displays Page.captureScreenshot returns
   * a DEVICE-pixel image (e.g. 2× the CSS size). We must (a) tell the model
   * the image's real pixel size and (b) map the model's coordinates from
   * IMAGE space back to CSS space (what CDP Input expects) — otherwise clicks
   * land at the wrong place. We resize the capture to a fixed CSS-pixel width
   * via Page.captureScreenshot's clip+scale so image space == CSS space and
   * the mapping is 1:1. */
  async screenshot(): Promise<string> {
    // Read the CSS viewport AND current scroll offset. A clip captures from
    // DOCUMENT coordinates, so we must clip from the scroll position (pageX/
    // pageY) — clipping from (0,0) captures the top of the document, which is
    // a white/blank region once the page is scrolled (the bug that made the
    // model see a white screen while elements were clearly present).
    let cssW = this.displayW;
    let cssH = this.displayH;
    let pageX = 0;
    let pageY = 0;
    try {
      const metrics = await this.send("Page.getLayoutMetrics");
      const vp = metrics.cssVisualViewport || metrics.cssLayoutViewport || metrics.layoutViewport || {};
      cssW = Math.round(vp.clientWidth || this.displayW);
      cssH = Math.round(vp.clientHeight || this.displayH);
      pageX = Math.round(vp.pageX || 0);
      pageY = Math.round(vp.pageY || 0);
    } catch {
      /* keep defaults */
    }
    // Fallback for scroll offset if layout metrics didn't carry pageX/pageY.
    if (!pageY) {
      try {
        const r = await this.send("Runtime.evaluate", {
          expression: "({ x: Math.round(scrollX), y: Math.round(scrollY) })",
          returnByValue: true,
        });
        pageX = r?.result?.value?.x ?? pageX;
        pageY = r?.result?.value?.y ?? pageY;
      } catch {
        /* ignore */
      }
    }
    this.cssW = cssW;
    this.cssH = cssH;

    // Normalise to a FIXED width (displayW) via clip.scale (Retina-safe), and
    // clip from the current scroll offset so we capture the VISIBLE viewport.
    const factor = cssW > 0 ? this.displayW / cssW : 1;
    const outW = this.displayW;
    const outH = Math.round(cssH * factor);
    const res = await this.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: pageX, y: pageY, width: cssW, height: cssH, scale: factor },
    });
    this.imgW = outW;
    this.imgH = outH;
    return res.data;
  }

  /** The image size the model is looking at (report to the planner so the
   * tool's coordinate space matches the image exactly). */
  get imageSize(): { width: number; height: number } {
    return { width: this.imgW || this.displayW, height: this.imgH || this.displayH };
  }

  /** Map a model coordinate (in image space = displayW-wide) to CSS px for
   * CDP Input. Inverse of the capture scale factor. */
  private scale(x: number, y: number): { x: number; y: number } {
    const sx = this.imgW ? this.cssW / this.imgW : 1;
    const sy = this.imgH ? this.cssH / this.imgH : 1;
    return { x: Math.round(x * sx), y: Math.round(y * sy) };
  }

  private async mouse(
    type: "mousePressed" | "mouseReleased" | "mouseMoved",
    x: number,
    y: number,
    button: "left" | "right" | "middle" | "none" = "left",
    clickCount = 1,
  ): Promise<void> {
    await this.send("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      button,
      buttons: button === "left" ? 1 : button === "right" ? 2 : button === "middle" ? 4 : 0,
      clickCount,
    });
  }

  private async click(x: number, y: number, button: "left" | "right" | "middle", count: number): Promise<void> {
    await this.mouse("mouseMoved", x, y, "none");
    for (let i = 1; i <= count; i++) {
      await this.mouse("mousePressed", x, y, button, i);
      await this.mouse("mouseReleased", x, y, button, i);
    }
  }

  private async typeText(text: string): Promise<void> {
    for (const ch of text) {
      await this.send("Input.dispatchKeyEvent", { type: "keyDown", text: ch });
      await this.send("Input.dispatchKeyEvent", { type: "keyUp", text: ch });
    }
  }

  // Map computer-use key names (xdotool style) to CDP.
  private async pressKey(combo: string): Promise<void> {
    const parts = combo.split("+").map((p) => p.trim());
    const modMap: Record<string, number> = { ctrl: 2, alt: 1, shift: 8, meta: 4, cmd: 4, super: 4 };
    let modifiers = 0;
    const keys: string[] = [];
    for (const p of parts) {
      const lc = p.toLowerCase();
      if (modMap[lc] !== undefined) modifiers |= modMap[lc];
      else keys.push(p);
    }
    const keyMap: Record<string, { key: string; code: string; vk: number }> = {
      Return: { key: "Enter", code: "Enter", vk: 13 },
      Enter: { key: "Enter", code: "Enter", vk: 13 },
      Tab: { key: "Tab", code: "Tab", vk: 9 },
      Escape: { key: "Escape", code: "Escape", vk: 27 },
      BackSpace: { key: "Backspace", code: "Backspace", vk: 8 },
      Delete: { key: "Delete", code: "Delete", vk: 46 },
      Down: { key: "ArrowDown", code: "ArrowDown", vk: 40 },
      Up: { key: "ArrowUp", code: "ArrowUp", vk: 38 },
      Left: { key: "ArrowLeft", code: "ArrowLeft", vk: 37 },
      Right: { key: "ArrowRight", code: "ArrowRight", vk: 39 },
      space: { key: " ", code: "Space", vk: 32 },
    };
    for (const k of keys) {
      const m = keyMap[k] || { key: k, code: `Key${k.toUpperCase()}`, vk: k.toUpperCase().charCodeAt(0) };
      await this.send("Input.dispatchKeyEvent", {
        type: "keyDown",
        modifiers,
        key: m.key,
        code: m.code,
        windowsVirtualKeyCode: m.vk,
      });
      await this.send("Input.dispatchKeyEvent", {
        type: "keyUp",
        modifiers,
        key: m.key,
        code: m.code,
        windowsVirtualKeyCode: m.vk,
      });
    }
  }

  /** Execute one computer-use action. May return a screenshot (for the
   * screenshot action) and/or ok/note (for element actions). */
  async execute(a: ComputerAction): Promise<{ screenshot?: string; ok?: boolean; note?: string }> {
    switch (a.action) {
      case "screenshot":
        return { screenshot: await this.screenshot() };
      case "mouse_move": {
        const { x, y } = this.scale(...a.coordinate);
        await this.mouse("mouseMoved", x, y, "none");
        return {};
      }
      case "left_click":
      case "right_click":
      case "middle_click": {
        const { x, y } = this.scale(...a.coordinate);
        const button = a.action === "right_click" ? "right" : a.action === "middle_click" ? "middle" : "left";
        // If the click opens a file dialog, our interceptor handles it.
        if (this.filePayload) this.fileChooserArmed = true;
        await this.click(x, y, button as any, 1);
        return {};
      }
      case "double_click": {
        const { x, y } = this.scale(...a.coordinate);
        await this.click(x, y, "left", 2);
        return {};
      }
      case "triple_click": {
        const { x, y } = this.scale(...a.coordinate);
        await this.click(x, y, "left", 3);
        return {};
      }
      case "left_click_drag": {
        const s = this.scale(...a.start_coordinate);
        const e = this.scale(...a.coordinate);
        await this.mouse("mousePressed", s.x, s.y, "left", 1);
        await this.mouse("mouseMoved", e.x, e.y, "left");
        await this.mouse("mouseReleased", e.x, e.y, "left", 1);
        return {};
      }
      case "left_mouse_down": {
        const { x, y } = this.scale(...a.coordinate);
        await this.mouse("mousePressed", x, y, "left", 1);
        return {};
      }
      case "left_mouse_up": {
        const { x, y } = this.scale(...a.coordinate);
        await this.mouse("mouseReleased", x, y, "left", 1);
        return {};
      }
      case "type":
        await this.typeText(a.text);
        return {};
      case "key":
        await this.pressKey(a.text);
        return {};
      case "hold_key": {
        // Approximate: press, wait, release via repeated keyDown.
        await this.pressKey(a.text);
        await new Promise((r) => setTimeout(r, Math.min(5000, (a.duration || 1) * 1000)));
        return {};
      }
      case "scroll": {
        const { x, y } = this.scale(...(a.coordinate || [this.cssW / 2, this.cssH / 2]));
        const dist = (a.scroll_amount || 3) * 100;
        const dx = a.scroll_direction === "left" ? -dist : a.scroll_direction === "right" ? dist : 0;
        const dy = a.scroll_direction === "up" ? -dist : a.scroll_direction === "down" ? dist : 0;
        // Trusted wheel event at the point.
        await this.send("Input.dispatchMouseEvent", {
          type: "mouseWheel",
          x,
          y,
          deltaX: dx,
          deltaY: dy,
        });
        // Fallback: some sites scroll an inner container, not the window, and
        // ignore synthetic wheel deltas. Programmatically scroll whatever
        // scrollable ancestor is under the cursor (and the window) so the
        // view actually moves. This is what unsticks pages the wheel can't.
        await this.send("Runtime.evaluate", {
          expression: `(() => {
            const x=${x}, y=${y}, dx=${dx}, dy=${dy};
            let el = document.elementFromPoint(x, y);
            const scrollable = (n) => { while (n && n !== document.body) {
              const s = getComputedStyle(n);
              if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (n.scrollHeight > n.clientHeight || n.scrollWidth > n.clientWidth)) return n;
              n = n.parentElement;
            } return null; };
            const target = scrollable(el);
            if (target) { target.scrollBy(dx, dy); }
            else { window.scrollBy(dx, dy); }
          })()`,
        });
        return {};
      }
      case "wait":
        await new Promise((r) => setTimeout(r, Math.min(10000, (a.duration || 1) * 1000)));
        return {};
      case "cursor_position":
        return {};
      case "click_element": {
        const r = await this.clickElement(a.index);
        return { note: r.note, ok: r.ok };
      }
      case "type_in_element": {
        const r = await this.typeInElement(a.index, a.text);
        return { note: r.note, ok: r.ok };
      }
      case "select_option": {
        const r = await this.selectOption(a.index, a.value);
        return { note: r.note, ok: r.ok };
      }
      case "upload_resume": {
        const r = await this.uploadResume(a.label);
        return { note: r.note, ok: r.ok };
      }
      default:
        return {};
    }
  }
}
