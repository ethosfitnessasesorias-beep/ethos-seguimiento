import { useRef, useState, type CSSProperties } from 'react'
import { mut } from '../theme'

interface ImageSlotProps {
  /** Placeholder text shown when no image is loaded. */
  placeholder?: string
  /** Border radius in px (rounded slots). Rect slots inherit the parent clip. */
  radius?: number
}

/**
 * Drop-in replacement for the prototype's <image-slot>: shows a dashed
 * placeholder and lets the user click or drag-drop a local image into it.
 */
export default function ImageSlot({ placeholder = 'Foto', radius = 0 }: ImageSlotProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = (file?: File | null) => {
    if (!file || !file.type.startsWith('image/')) return
    setSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  const base: CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    borderRadius: radius || undefined,
    cursor: 'pointer',
    overflow: 'hidden',
  }

  return (
    <div
      style={{
        ...base,
        background: src ? 'transparent' : '#161616',
        border: src
          ? 'none'
          : `1px dashed ${over ? 'rgba(219,24,9,0.6)' : 'rgba(255,255,255,0.12)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        load(e.dataTransfer.files?.[0])
      }}
    >
      {src ? (
        <img
          src={src}
          alt={placeholder}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: mut(0.35),
            letterSpacing: 0.3,
            padding: '0 8px',
            textAlign: 'center',
          }}
        >
          {placeholder}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => load(e.target.files?.[0])}
      />
    </div>
  )
}
