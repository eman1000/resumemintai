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
  | { action: "cursor_position" };

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
    // Read the CSS viewport so we know the page's logical coordinate space.
    let cssW = this.displayW;
    let cssH = this.displayH;
    try {
      const metrics = await this.send("Page.getLayoutMetrics");
      const vp = metrics.cssVisualViewport || metrics.cssLayoutViewport || metrics.layoutViewport || {};
      cssW = Math.round(vp.clientWidth || this.displayW);
      cssH = Math.round(vp.clientHeight || this.displayH);
    } catch {
      /* keep defaults */
    }
    this.cssW = cssW;
    this.cssH = cssH;

    // Normalise the capture to a FIXED width (displayW) regardless of the
    // page's real viewport or the device pixel ratio. clip.scale resizes the
    // output, so the image the model sees is always displayW px wide. This
    // keeps the model's coordinate space constant and sidesteps Retina 2×.
    const factor = cssW > 0 ? this.displayW / cssW : 1;
    const outW = this.displayW;
    const outH = Math.round(cssH * factor);
    const res = await this.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      clip: { x: 0, y: 0, width: cssW, height: cssH, scale: factor },
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

  /** Execute one computer-use action. Returns a screenshot for screenshot/
   * action results, or null for actions that don't need one. */
  async execute(a: ComputerAction): Promise<{ screenshot?: string }> {
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
        const { x, y } = this.scale(...a.coordinate);
        const dist = (a.scroll_amount || 3) * 100;
        const dx = a.scroll_direction === "left" ? -dist : a.scroll_direction === "right" ? dist : 0;
        const dy = a.scroll_direction === "up" ? -dist : a.scroll_direction === "down" ? dist : 0;
        await this.send("Input.dispatchMouseEvent", {
          type: "mouseWheel",
          x,
          y,
          deltaX: dx,
          deltaY: dy,
        });
        return {};
      }
      case "wait":
        await new Promise((r) => setTimeout(r, Math.min(10000, (a.duration || 1) * 1000)));
        return {};
      case "cursor_position":
        return {};
      default:
        return {};
    }
  }
}
