// svgBackend.ts
import React from "react";
import { Backend } from "./engine";

type Frame = { x: number; y: number; w: number; h: number };

export class SvgBackend implements Backend {
  private frames: Frame[] = [{ x: 25, y: 25, w: 595.28 - 50, h: 841.89 - 50 }];
  public nodes: React.ReactNode[] = [];

  pushFrame(p: Partial<Frame>) {
    const f = this.getFrame();
    this.frames.push({
      x: p.x ?? f.x,
      y: p.y ?? f.y,
      w: p.w ?? f.w,
      h: p.h ?? f.h,
    });
  }
  popFrame() { this.frames.pop(); }
  getFrame() { return this.frames[this.frames.length - 1]; }

  textWidth(text: string, _font: string, size: number) {
    // rough average; swap for a real measurer if needed
    return text.length * size * 0.55;
  }
  lineHeightFor(size: number) { return Math.round(size * 1.25); }

  drawText(run: any) {
    this.nodes.push(
      <text key={`t-${this.nodes.length}`}
        x={run.x} y={run.y}
        fill={run.color}
        fontFamily={run.fontName}
        fontSize={run.fontSize}
        style={{ fontWeight: run.fontStyle === "bold" ? 700 : 400, fontStyle: run.fontStyle === "italic" ? "italic" : "normal" }}
      >
        {run.value}
      </text>
    );
  }

  drawRect(run: any) {
    this.nodes.push(
      <rect key={`r-${this.nodes.length}`} x={run.x} y={run.y} width={run.w} height={run.h} fill={run.color || "none"} />
    );
  }

  drawCircle(run: any) {
    this.nodes.push(
      <circle key={`c-${this.nodes.length}`} cx={run.cx} cy={run.cy} r={run.r} fill={run.color || "none"} />
    );
  }

  drawImage(run: any) {
    if (!run.data) return;
    this.nodes.push(
      <image key={`i-${this.nodes.length}`} href={run.data} x={run.x} y={run.y} width={run.w} height={run.h} preserveAspectRatio="xMidYMid slice" />
    );
  }

  drawIcon(run: any) {
    // placeholder: draw a small square; map run.value to your icon set if you have one
    this.nodes.push(
      <rect key={`ic-${this.nodes.length}`} x={run.x} y={run.y} width={run.w} height={run.h} fill={run.color || "#888"} rx={2} ry={2} />
    );
  }
}
