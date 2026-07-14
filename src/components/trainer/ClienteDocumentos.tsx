import { useCallback, useEffect, useRef, useState } from 'react'
import { colors, mut } from '../../theme'
import {
  addDocument,
  catStyle,
  deleteDocument,
  DOC_CATEGORIES,
  humanSize,
  listDocuments,
  type DocCategory,
  type DocumentWithUrl,
} from '../../lib/documents'
import { FileIcon, Download } from '../icons'
import Modal from '../Modal'

const card: React.CSSProperties = { background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }

export default function ClienteDocumentos({ clientId }: { clientId: string }) {
  const [docs, setDocs] = useState<DocumentWithUrl[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)

  const reload = useCallback(async () => {
    try {
      setDocs(await listDocuments(clientId))
    } catch {
      setDocs([])
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    reload()
  }, [reload])

  const remove = async (d: DocumentWithUrl) => {
    if (!confirm('¿Eliminar este documento?')) return
    await deleteDocument(d)
    reload()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: mut(0.5) }}>Documentos que verá el cliente (planes, guías…).</div>
        <button onClick={() => setUploadOpen(true)} style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 11, padding: '10px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Subir documento
        </button>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: mut(0.4), padding: 10 }}>Cargando…</div>
      ) : docs.length === 0 ? (
        <div style={{ ...card, border: '1px dashed rgba(255,255,255,0.12)', padding: '34px 18px', textAlign: 'center', fontSize: 13, color: mut(0.45) }}>
          Aún no has subido documentos para este cliente.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {docs.map((d) => {
            const st = catStyle(d.category)
            return (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 13, ...card, padding: '14px 15px' }}>
                <div style={{ width: 42, height: 42, flex: 'none', borderRadius: 11, background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileIcon size={19} stroke={st.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{d.title}</div>
                  <div style={{ fontSize: 11, color: mut(0.45), marginTop: 3 }}>
                    <span style={{ color: st.color, fontWeight: 600 }}>{d.category}</span> · {d.created_at.slice(0, 10)}
                    {d.size_bytes ? ` · ${humanSize(d.size_bytes)}` : ''}
                  </div>
                </div>
                {d.url && (
                  <a href={d.url} target="_blank" rel="noreferrer" style={{ color: mut(0.6) }}>
                    <Download />
                  </a>
                )}
                <button onClick={() => remove(d)} style={{ background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 15 }}>✕</button>
              </div>
            )
          })}
        </div>
      )}

      {uploadOpen && (
        <UploadModal
          clientId={clientId}
          onClose={() => setUploadOpen(false)}
          onDone={() => {
            setUploadOpen(false)
            reload()
          }}
        />
      )}
    </div>
  )
}

function UploadModal({ clientId, onClose, onDone }: { clientId: string; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<DocCategory>('Entrenamiento')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async () => {
    if (!file) {
      setErr('Elige un archivo.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      await addDocument(clientId, file, title, category)
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo subir.')
      setBusy(false)
    }
  }

  return (
    <Modal title="Subir documento" onClose={onClose}>
      <label style={{ display: 'block', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>Título</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Plan de entrenamiento · Bloque 3" style={fieldStyle} />
      </label>

      <div style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, marginBottom: 6 }}>CATEGORÍA</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {DOC_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            style={{ flex: 1, background: category === c.key ? c.bg : colors.surface2, color: category === c.key ? c.color : mut(0.6), border: `1px solid ${category === c.key ? c.color : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '10px 0', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
          >
            {c.key}
          </button>
        ))}
      </div>

      <button onClick={() => inputRef.current?.click()} style={{ width: '100%', background: colors.surface2, color: file ? colors.text : mut(0.6), border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 10, padding: 14, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        {file ? `📎 ${file.name}` : 'Elegir archivo (PDF, imagen…)'}
      </button>
      <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

      {err && <div style={{ fontSize: 12.5, color: '#f5a99f', marginTop: 12 }}>{err}</div>}
      <button onClick={upload} disabled={busy} style={{ width: '100%', marginTop: 16, background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Subiendo…' : 'Subir documento'}
      </button>
    </Modal>
  )
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: colors.surface2,
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '11px 12px',
  color: colors.text,
  fontFamily: 'inherit',
  fontSize: 14,
  outline: 'none',
}
