// app/builder/components/WysiwygEditor.tsx
"use client";
import React, { useEffect, useState } from "react";

export type RawDraft = import("draft-js").RawDraftContentState;

function useIsClient() { const [c, s] = useState(false); useEffect(()=>{s(true)},[]); return c; }
function ensureRdwCssOnce() {
  if (typeof window === "undefined") return;
  const d = window.document; if (!d || !d.head) return;
  if (d.getElementById("rdw-css-cdn")) return;
  const link = d.createElement("link");
  link.id = "rdw-css-cdn";
  link.rel = "stylesheet";
  link.href = "https://cdn.jsdelivr.net/npm/react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
  d.head.appendChild(link);
}

// an empty RAW for new fields
export const emptyRaw: RawDraft = {
  blocks: [{ key: "init", text: "", type: "unstyled", depth: 0, inlineStyleRanges: [], entityRanges: [], data: {} }],
  entityMap: {}
};

export const WysiwygEditor: React.FC<{
  raw?: RawDraft;                         // <- controlled value (RAW)
  onChangeRaw?: (raw: RawDraft) => void;  // <- notify parent with RAW
  placeholder?: string;
}> = ({ raw, onChangeRaw, placeholder }) => {
  const isClient = useIsClient();
  const [EditorComp, setEditorComp] = useState<any>(null);
  const [dj, setDj] = useState<any>(null);
  const [editorState, setEditorState] = useState<any>(null);

  useEffect(() => {
    if (!isClient) return; ensureRdwCssOnce();
    let mounted = true;
    (async () => {
      const mod = await import("react-draft-wysiwyg");
      const draftjs = await import("draft-js");
      if (!mounted) return;
      setEditorComp(() => mod.Editor);
      setDj(draftjs);
    })();
    return () => { mounted = false; };
  }, [isClient]);

  // (re)build from RAW when parent changes
  useEffect(() => {
    if (!dj) return;
    const { EditorState, convertFromRaw, ContentState } = dj;
    const st = raw
      ? EditorState.createWithContent(convertFromRaw(raw))
      : EditorState.createWithContent(ContentState.createFromText(""));
    setEditorState(st);
  }, [dj, raw]);

  const handleChange = (st: any) => {
    setEditorState(st);
    if (dj && onChangeRaw) {
      const { convertToRaw } = dj;
      onChangeRaw(convertToRaw(st.getCurrentContent()));   // 🔸 RAW out
    }
  };

  if (!isClient || !EditorComp || !dj || !editorState) {
    return <textarea className="w-full min-h-[140px] rounded border p-2" placeholder={placeholder} readOnly />;
  }

  return (
    <EditorComp
      editorState={editorState}
      onEditorStateChange={handleChange}
      placeholder={placeholder}
      toolbar={{
        options: ["inline", "list", "link", "emoji", "history"],
        inline: { options: ["bold", "italic", "underline", "strikethrough"] },
        list: { options: ["unordered", "ordered", "indent", "outdent"] },
      }}
      editorClassName="min-h-[160px] p-2 border rounded text-left"
      toolbarClassName="border rounded mb-2"
    />
  );
};
