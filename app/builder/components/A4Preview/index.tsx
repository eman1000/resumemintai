import { Props } from "next/script";
import { useRef } from "react";
import { CircularProps, CircularTemplate } from "../CircularTemplate";
import { exportSvgContainerToPdf } from "./exportSvgPdf";
import ProfessionalTemplate from "../ProfessionalTemplate";
import ElegantTemplate from "../ElegantTemplate";
import { ClassicTemplate } from "../ClassicTemplate";
type Props = CircularProps & {
  filename?: string;
  props: any;
  selectedTemplate: any;
  wrapRef: React.RefObject<HTMLDivElement>;
  handleDownload: () => Promise<void>;
};
export const A4Preview: React.FC<Props> = ({ filename = "resume.pdf", selectedTemplate, props, wrapRef, handleDownload }) => {


  return (
    <>
      {/* SCROLL AREA */}
      <div className="max-h-[calc(100vh-2rem)] overflow-auto rounded border bg-white p-3"
           style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* This inner container holds the multi-page SVGs and is targeted for PDF */}
        <div ref={wrapRef} className="flex flex-col items-center gap-4">
          {selectedTemplate?.renderer === 'circular' && <CircularTemplate {...props} />}
          {selectedTemplate?.renderer === 'professional' && <ProfessionalTemplate {...props} />}
          {selectedTemplate?.renderer === 'elegant' && <ElegantTemplate {...props} />}
          {selectedTemplate?.renderer === 'classic' && <ClassicTemplate {...props} />}
        </div>
      </div>

      <div className="mt-3">
        <button className="border rounded px-3 py-2" onClick={handleDownload}>Download PDF</button>
      </div>
    </>
  );
};
