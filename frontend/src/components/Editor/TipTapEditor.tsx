"use client";

import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Table2,
  Undo2
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { FileTrigger } from "@/components/ui/file-trigger";
import { cn } from "@/lib/utils";

type EditorPayload = {
  html: string;
  json: Record<string, unknown>;
};

type TipTapEditorProps = {
  content: string;
  editable?: boolean;
  onChange: (payload: EditorPayload) => void;
  onImageUpload?: (file: File) => Promise<string>;
};

export function TipTapEditor({ content, editable = true, onChange, onImageUpload }: TipTapEditorProps) {
  const latestHtmlRef = useRef(content);
  const [uploadingImage, setUploadingImage] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      TableKit.configure({
        table: {
          resizable: true,
          HTMLAttributes: {
            class: "eia-editor-table"
          }
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: "eia-editor-image"
        }
      })
    ],
    content: content || "<p></p>",
    editorProps: {
      attributes: {
        class: "tiptap-prosemirror"
      }
    },
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML();
      latestHtmlRef.current = html;
      onChange({
        html,
        json: currentEditor.getJSON() as Record<string, unknown>
      });
    }
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const nextContent = content || "<p></p>";
    if (nextContent !== latestHtmlRef.current && nextContent !== editor.getHTML()) {
      latestHtmlRef.current = nextContent;
      editor.commands.setContent(nextContent, { emitUpdate: false });
    }
  }, [content, editor]);

  async function uploadImage(file: File) {
    if (!file || !editor || !onImageUpload) {
      return;
    }

    setUploadingImage(true);
    try {
      const url = await onImageUpload(file);
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-white/[0.04] px-3 py-2">
        <ToolbarButton
          active={editor?.isActive("bold")}
          disabled={!editable || !editor}
          icon={<Bold />}
          label="Bold"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          active={editor?.isActive("italic")}
          disabled={!editable || !editor}
          icon={<Italic />}
          label="Italic"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          active={editor?.isActive("heading", { level: 1 })}
          disabled={!editable || !editor}
          icon={<Heading1 />}
          label="Heading 1"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        />
        <ToolbarButton
          active={editor?.isActive("heading", { level: 2 })}
          disabled={!editable || !editor}
          icon={<Heading2 />}
          label="Heading 2"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <span className="mx-1 h-6 w-px bg-white/10" />
        <ToolbarButton
          active={editor?.isActive("bulletList")}
          disabled={!editable || !editor}
          icon={<List />}
          label="Bullet list"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          active={editor?.isActive("orderedList")}
          disabled={!editable || !editor}
          icon={<ListOrdered />}
          label="Numbered list"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          disabled={!editable || !editor}
          icon={<Table2 />}
          label="Insert table"
          onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        />
        <FileTrigger
          accept=".gif,.jpeg,.jpg,.png,.webp"
          className={cn(uploadingImage && "animate-pulse")}
          disabled={!editable || !editor || !onImageUpload || uploadingImage}
          size="icon"
          title="Upload image"
          onFileSelect={uploadImage}
        >
          <ImageIcon />
        </FileTrigger>
        <span className="mx-1 h-6 w-px bg-white/10" />
        <ToolbarButton
          disabled={!editable || !editor || !editor.can().undo()}
          icon={<Undo2 />}
          label="Undo"
          onClick={() => editor?.chain().focus().undo().run()}
        />
        <ToolbarButton
          disabled={!editable || !editor || !editor.can().redo()}
          icon={<Redo2 />}
          label="Redo"
          onClick={() => editor?.chain().focus().redo().run()}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

type ToolbarButtonProps = {
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

function ToolbarButton({ active = false, disabled = false, icon, label, onClick }: ToolbarButtonProps) {
  return (
    <Button
      aria-label={label}
      className={cn(active && "border-[#67E8F9]/30 bg-[#67E8F9]/12 text-[#B6F7FF]")}
      disabled={disabled}
      size="icon"
      title={label}
      type="button"
      variant="secondary"
      onClick={onClick}
    >
      {icon}
    </Button>
  );
}
