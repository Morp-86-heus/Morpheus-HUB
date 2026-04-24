import { useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'

function Btn({ onMouseDown, active, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onMouseDown() }}
      title={title}
      className={`px-1.5 py-1 rounded text-sm transition-colors select-none ${
        active ? 'bg-gray-300 text-gray-900' : 'text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <div className="w-px bg-gray-300 self-stretch mx-0.5" />
}

function ColorBtn({ title, value, onChange, children }) {
  const ref = useRef()
  return (
    <label
      title={title}
      className="relative px-1.5 py-1 rounded text-sm text-gray-600 hover:bg-gray-200 cursor-pointer select-none flex items-center"
      onMouseDown={e => e.preventDefault()}
    >
      {children}
      <input
        ref={ref}
        type="color"
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        value={value || '#000000'}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  )
}

export default function RichTextEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value || '',
    onUpdate({ editor }) {
      const html = editor.getHTML()
      onChange(html === '<p></p>' ? '' : html)
    },
  })

  if (!editor) return null

  const e = editor

  return (
    <div className="border border-gray-300 rounded overflow-hidden focus-within:ring-2 focus-within:ring-blue-400">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">

        {/* Testo */}
        <Btn onMouseDown={() => e.chain().focus().toggleBold().run()} active={e.isActive('bold')} title="Grassetto (Ctrl+B)">
          <strong>B</strong>
        </Btn>
        <Btn onMouseDown={() => e.chain().focus().toggleItalic().run()} active={e.isActive('italic')} title="Corsivo (Ctrl+I)">
          <em>I</em>
        </Btn>
        <Btn onMouseDown={() => e.chain().focus().toggleUnderline().run()} active={e.isActive('underline')} title="Sottolineato (Ctrl+U)">
          <span className="underline">U</span>
        </Btn>
        <Btn onMouseDown={() => e.chain().focus().toggleStrike().run()} active={e.isActive('strike')} title="Barrato">
          <s>S</s>
        </Btn>

        <Sep />

        {/* Titoli */}
        <Btn onMouseDown={() => e.chain().focus().toggleHeading({ level: 2 }).run()} active={e.isActive('heading', { level: 2 })} title="Titolo H2">
          <span className="font-bold text-xs">H2</span>
        </Btn>
        <Btn onMouseDown={() => e.chain().focus().toggleHeading({ level: 3 }).run()} active={e.isActive('heading', { level: 3 })} title="Titolo H3">
          <span className="font-bold text-xs">H3</span>
        </Btn>

        <Sep />

        {/* Colori */}
        <ColorBtn
          title="Colore testo"
          value={e.getAttributes('textStyle').color}
          onChange={color => e.chain().focus().setColor(color).run()}
        >
          <span className="font-bold text-xs leading-none">
            A
            <span
              className="block h-0.5 mt-0.5 rounded"
              style={{ backgroundColor: e.getAttributes('textStyle').color || '#374151' }}
            />
          </span>
        </ColorBtn>

        <ColorBtn
          title="Evidenzia testo"
          value={e.getAttributes('highlight').color}
          onChange={color => e.chain().focus().toggleHighlight({ color }).run()}
        >
          <span className="text-xs leading-none">
            <span
              className="font-bold px-0.5"
              style={{ backgroundColor: e.getAttributes('highlight').color || '#fef08a', borderRadius: 2 }}
            >
              ab
            </span>
          </span>
        </ColorBtn>

        <Btn onMouseDown={() => e.chain().focus().unsetColor().run()} active={false} title="Rimuovi colore testo">
          <span className="text-xs text-gray-400">✕A</span>
        </Btn>

        <Sep />

        {/* Allineamento */}
        <Btn onMouseDown={() => e.chain().focus().setTextAlign('left').run()} active={e.isActive({ textAlign: 'left' })} title="Allinea a sinistra">
          <span className="text-xs">⬛▬▬</span>
        </Btn>
        <Btn onMouseDown={() => e.chain().focus().setTextAlign('center').run()} active={e.isActive({ textAlign: 'center' })} title="Centra">
          <span className="text-xs">▬⬛▬</span>
        </Btn>
        <Btn onMouseDown={() => e.chain().focus().setTextAlign('right').run()} active={e.isActive({ textAlign: 'right' })} title="Allinea a destra">
          <span className="text-xs">▬▬⬛</span>
        </Btn>

        <Sep />

        {/* Liste e blocchi */}
        <Btn onMouseDown={() => e.chain().focus().toggleBulletList().run()} active={e.isActive('bulletList')} title="Lista puntata">
          <span className="text-xs">• —</span>
        </Btn>
        <Btn onMouseDown={() => e.chain().focus().toggleOrderedList().run()} active={e.isActive('orderedList')} title="Lista numerata">
          <span className="text-xs">1. —</span>
        </Btn>
        <Btn onMouseDown={() => e.chain().focus().toggleBlockquote().run()} active={e.isActive('blockquote')} title="Citazione">
          <span className="text-xs font-serif">"</span>
        </Btn>
        <Btn onMouseDown={() => e.chain().focus().toggleCode().run()} active={e.isActive('code')} title="Codice inline">
          <span className="font-mono text-xs">{"`c`"}</span>
        </Btn>
        <Btn onMouseDown={() => e.chain().focus().toggleCodeBlock().run()} active={e.isActive('codeBlock')} title="Blocco codice">
          <span className="font-mono text-xs">{"{ }"}</span>
        </Btn>

        <Sep />

        {/* Undo / Redo */}
        <Btn onMouseDown={() => e.chain().focus().undo().run()} active={false} title="Annulla (Ctrl+Z)">
          <span className="text-xs">↩</span>
        </Btn>
        <Btn onMouseDown={() => e.chain().focus().redo().run()} active={false} title="Ripristina (Ctrl+Y)">
          <span className="text-xs">↪</span>
        </Btn>
      </div>

      <EditorContent editor={editor} className="rich-editor-content px-3 py-2 min-h-[120px] text-sm" />
    </div>
  )
}
