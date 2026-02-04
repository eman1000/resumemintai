import React from "react";
import { CircularTemplate } from "../CircularTemplate";
import ProfessionalTemplate from "../ProfessionalTemplate";
import ElegantTemplate from "../ElegantTemplate";
import { ClassicTemplate } from "../ClassicTemplate";

type Props = {
  filename?: string;
  props: any;
  selectedTemplate: any;
  wrapRef: React.RefObject<HTMLDivElement>;
  handleDownload: () => Promise<void>;
};

// IMPORTANT: set this to your real fixed resume width in px.
// If your SVG/page is 794px wide for A4 @96dpi, use 794.
// If it’s 816, use 816, etc.
const BASE_PAGE_WIDTH = 794;

export const A4Preview: React.FC<Props> = ({
  filename = "resume.pdf",
  selectedTemplate,
  props,
  wrapRef,
  handleDownload,
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const compute = () => {
      const padding = 24; // rough inner padding allowance
      const available = el.clientWidth - padding;
      const next = Math.min(1, Math.max(0.35, available / BASE_PAGE_WIDTH));
      setScale(next);
    };

    compute();

    const ro = new ResizeObserver(() => compute());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={scrollRef}
      className="max-h-[calc(100vh-2rem)] overflow-auto rounded border bg-white p-3"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {/* This outer wrapper keeps correct scroll height */}
      <div
        style={{
          width: BASE_PAGE_WIDTH * scale,
          transformOrigin: "top center",
        }}
        className="mx-auto"
      >
        {/* This inner is actually scaled */}
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            width: BASE_PAGE_WIDTH, // keep the fixed layout width
          }}
        >
          <div ref={wrapRef} className="flex flex-col items-center gap-4">
            {selectedTemplate?.renderer === "circular" && <CircularTemplate {...props} />}
            {selectedTemplate?.renderer === "professional" && <ProfessionalTemplate {...props} />}
            {selectedTemplate?.renderer === "elegant" && <ElegantTemplate {...props} />}
            {selectedTemplate?.renderer === "classic" && <ClassicTemplate {...props} />}
          </div>
        </div>
      </div>
    </div>
  );
};
