import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { readLocal, removeLocal, writeLocal } from '../localStore'

const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/avif']
const MAX_DIM = 1200

// Re-encode through a canvas so localStorage carries downscaled bytes, not the
// raw upload. Longest side capped at 2× the slot width (retina) and MAX_DIM.
async function toDataUrl(file: File, targetW: number): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const cap = Math.min(MAX_DIM, Math.round(targetW * 2))
    const scale = Math.min(1, cap / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, w, h)
    return canvas.toDataURL('image/webp', 0.85)
  } finally {
    bitmap.close?.()
  }
}

export function ImageSlot({ id, placeholder }: { id: string; placeholder: string }) {
  const storeKey = `ax2026-img:${id}`
  const [url, setUrl] = useState<string | null>(() => readLocal(storeKey))
  const [over, setOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const ingest = async (file?: File | null) => {
    if (!file) return
    if (!ACCEPT.includes(file.type)) {
      setError('请用 PNG / JPEG / WebP / AVIF 图片')
      return
    }
    const width = rootRef.current?.clientWidth || 600
    let dataUrl: string
    try {
      dataUrl = await toDataUrl(file, width)
    } catch {
      // Corrupt/undecodable file that slipped past the MIME check.
      setError('无法读取这张图片')
      return
    }
    // Show the image regardless, but warn if it was too big to persist so the
    // user knows it will be gone on reload (localStorage quota).
    const saved = writeLocal(storeKey, dataUrl)
    setUrl(dataUrl)
    setError(saved ? null : '图片太大，刷新后会丢失')
  }

  const clear = () => {
    removeLocal(storeKey)
    setUrl(null)
    setError(null)
  }

  return (
    <div
      ref={rootRef}
      className={`imgslot ${over ? 'over' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setOver(false)
        void ingest(event.dataTransfer.files?.[0])
      }}
    >
      {url ? (
        <>
          <img src={url} alt="" />
          <button type="button" className="imgslot-clear" onClick={clear} aria-label="移除照片">
            <X size={15} strokeWidth={2.5} />
          </button>
        </>
      ) : (
        <button type="button" className="imgslot-empty" onClick={() => inputRef.current?.click()}>
          <ImagePlus size={26} strokeWidth={1.7} />
          <span className="imgslot-cap">{placeholder}</span>
          <span className="imgslot-sub">点击或拖入图片</span>
        </button>
      )}
      {error && <span className="imgslot-err">{error}</span>}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(',')}
        hidden
        onChange={(event) => {
          void ingest(event.target.files?.[0])
          event.target.value = ''
        }}
      />
    </div>
  )
}
