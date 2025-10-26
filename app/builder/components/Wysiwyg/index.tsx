"use client";
import React, { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";

type Props = {
  value?: string;                 // HTML
  onChange?: (html: string)=>void;
  placeholder?: string;
};

export default function Wysiwyg({ value = "", onChange, placeholder }: Props) {
  const isClient = typeof window !== "undefined";

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: true },
        orderedList: { keepMarks: true, keepAttributes: true },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        protocols: ["http", "https", "mailto", "tel"],
      }),
    ],
      content: value || "",

    editorProps: {
      attributes: {
          class: "tiptap min-h-[160px] p-2 rounded text-left"
      },
    },
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    // ⬇️ important for Next.js SSR to avoid hydration mismatch
    immediatelyRender: false,
  }, [isClient]); // reinit if we cross from SSR->CSR

  // Update editor if parent replaces the value
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || "<p></p>";
    if (current !== incoming) {
      editor.commands.setContent(incoming, { emitUpdate: false });
      editor.commands.focus("end");
    }
  }, [value, editor]);

  // During SSR (or before the editor is ready) render a safe fallback
  if (!isClient || !editor) {
    return (
      <div className="border rounded">
        <div className="flex flex-wrap gap-1 p-2 border-b bg-white">
          <div className="ms-auto text-xs text-gray-500">{placeholder}</div>
        </div>
        <textarea
          className="w-full min-h-[160px] p-2 outline-none"
          defaultValue={value}
          placeholder={placeholder}
          readOnly
        />
      </div>
    );
  }

  return (
    <div className="border rounded">
      {/* simple toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b bg-white">
        <Btn on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>B</Btn>
        <Btn on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}><i>I</i></Btn>
        <Btn on={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")}><u>U</u></Btn>
        <Btn on={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")}><s>S</s></Btn>
        <Sep/>
        <Btn on={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>• List</Btn>
        <Btn on={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>1. List</Btn>
        <Sep/>
        <Btn on={() => editor.chain().focus().undo().run()}>↶</Btn>
        <Btn on={() => editor.chain().focus().redo().run()}>↷</Btn>
        <div className="ms-auto text-xs text-gray-500">{placeholder}</div>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

function Btn({ on, active, children }: { on: ()=>void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={on}
      className={`px-2 py-1 border rounded text-sm ${active ? "bg-blue-50 border-blue-400" : "bg-white border-gray-300 hover:bg-gray-50"}`}
    >
      {children}
    </button>
  );
}
function Sep() { return <span className="w-px h-6 bg-gray-200 mx-1" />; }
