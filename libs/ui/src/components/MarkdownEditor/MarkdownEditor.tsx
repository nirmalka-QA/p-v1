import { useEffect } from 'react'
import { Skeleton } from '@mantine/core'
import { RichTextEditor } from '@mantine/tiptap'
import { useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Link } from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Markdown } from 'tiptap-markdown'

interface MarkdownEditorProps {
  /** Current value as a markdown string. */
  value: string
  /** Emits the edited content back as a markdown string. */
  onChange: (markdown: string) => void
  minHeight?: number
}

/** The markdown storage shape contributed by `tiptap-markdown` (typed locally to avoid `any`). */
interface MarkdownStorage {
  markdown: { getMarkdown: () => string }
}

function getMarkdown(editor: Editor): string {
  return (editor.storage as unknown as MarkdownStorage).markdown.getMarkdown()
}

/**
 * WYSIWYG editor for markdown content. The user edits formatted text (headings,
 * lists, tables, code) while the value read and written is always a markdown
 * string — so storage, rendering, and the impact engine keep working on markdown.
 * Reusable across any markdown field; today it backs the KB note body.
 */
export function MarkdownEditor({ value, onChange, minHeight = 280 }: MarkdownEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // StarterKit bundles Link in v3; disable it so the standalone Link (required
      // by @mantine/tiptap's Link control) is the single source of truth.
      StarterKit.configure({ link: false }),
      Link,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Markdown,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(getMarkdown(editor)),
  })

  // Sync external value changes (e.g. the form modal re-opening on a different
  // note) without clobbering the cursor during local typing.
  useEffect(() => {
    if (!editor) return
    if (value !== getMarkdown(editor)) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) return <Skeleton height={minHeight} radius="sm" />

  return (
    <RichTextEditor editor={editor}>
      <RichTextEditor.Toolbar sticky>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Bold />
          <RichTextEditor.Italic />
          <RichTextEditor.Strikethrough />
          <RichTextEditor.Code />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.H1 />
          <RichTextEditor.H2 />
          <RichTextEditor.H3 />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.BulletList />
          <RichTextEditor.OrderedList />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Blockquote />
          <RichTextEditor.CodeBlock />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Link />
          <RichTextEditor.Unlink />
        </RichTextEditor.ControlsGroup>
      </RichTextEditor.Toolbar>
      <RichTextEditor.Content mih={minHeight} />
    </RichTextEditor>
  )
}
