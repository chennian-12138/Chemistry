"use client";

import { useState } from "react";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import {
  Bold,
  Italic,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
}
export function RichTextEditor({
  value,
  onChange,
  onFocus,
  placeholder,
}: RichTextEditorProps) {
  const [, setUpdateKey] = useState(0);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Subscript,
      Superscript,
      Placeholder.configure({
        placeholder: placeholder || "Write something...",
      }),
    ],
    immediatelyRender: false,
    content: value,
    editorProps: {
      attributes: {
        class:
          "min-h-[120px] w-full bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
      },
    },
    onFocus: () => {
      if (onFocus) {
        onFocus();
      }
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: () => {
      // Intentionally left blank or can be removed
    },
    onTransaction: () => {
      // Force React to re-render the toolbar so active states update immediately
      // on formatting changes (like clicking the bold button), not just on content changes.
      setUpdateKey((prev) => prev + 1);
    },
  });

  if (!editor) {
    return null;
  }

  // Determine active ToggleGroupItems based on editor state
  const activeToggles = [];
  if (editor.isActive("bold")) activeToggles.push("bold");
  if (editor.isActive("italic")) activeToggles.push("italic");
  if (editor.isActive("subscript")) activeToggles.push("subscript");
  if (editor.isActive("superscript")) activeToggles.push("superscript");

  return (
    <div className="flex flex-col rounded-md border border-input focus-within:ring-1 focus-within:ring-ring shadow-sm bg-background">
      <div className="flex items-center gap-1 border-b bg-muted/40 p-1">
        <ToggleGroup
          type="multiple"
          variant="outline"
          value={activeToggles}
          onValueChange={() => {
            // Re-apply states if the group change doesn't align with editor (fallback guard)
          }}
        >
          <ToggleGroupItem
            value="bold"
            aria-label="Toggle bold"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="italic"
            aria-label="Toggle italic"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic />
          </ToggleGroupItem>

          <ToggleGroupItem
            value="subscript"
            aria-label="Toggle subscript"
            onClick={() => editor.chain().focus().toggleSubscript().run()}
          >
            <SubscriptIcon />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="superscript"
            aria-label="Toggle superscript"
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
          >
            <SuperscriptIcon />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none p-2 [&_.ProseMirror]:min-h-[100px] [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
