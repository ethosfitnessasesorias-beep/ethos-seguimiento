import { useCallback, useEffect, useRef, useState } from 'react'
import { colors, mut } from '../../theme'
import {
  addDocument,
  catStyle,
  createFolder,
  deleteDocument,
  deleteFolder,
  humanSize,
  listDocuments,
  listFolders,
  moveDocument,
  UPLOAD_CATEGORIES,
  type DocCategory,
  type DocFolder,
  type DocumentWithUrl,
} from '../../lib/documents'
import { sendNow } from '../../lib/messages'
import { FileIcon, Download } from '../icons'
import Modal from '../Modal'

const card: React.CSSProperties = { background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }

export default function ClienteDocumentos({ clientId }: { clientId: string }) {
  const [docs, setDocs] = useState<DocumentWithUrl[]>([])
  const [folders, setFolders] = useState<DocFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [folderOpen, setFolderOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const reload = useCallback(async () => {
    try {
      const [d, f] = await Promise.all([listDocuments(clientId), listFolders(clientId)])
      setDocs(d)
      setFolders(f)
      setCollapsed(new Set(f.map((x) => x.id))) // carpetas plegadas por defecto
    } catch {
      setDocs([])
      setFolders([])
    } finally {
      setLoading(false)
    }
  }, [clientId])

  const toggleFolder = (id: string) =>
    setCollapsed((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  useEffect(() => {
    reload()
  }, [reload])

  const remove = async (d: DocumentWithUrl) => {
    if (!confirm('¿Eliminar este documento?')) return
    await deleteDocument(d)
    reload()
  }
  const removeFolder = async (f: DocFolder) => {
    if (!confirm(`¿Eliminar la carpeta «${f.name}»? Los documentos que contiene NO se borran, quedan sin carpeta.`)) return
    await deleteFolder(f.id)
    reload()
  }

  // Grupos: una sección por carpeta + "Sin carpeta".
  const groups: { folder: DocFolder | null; docs: DocumentWithUrl[] }[] = [
    ...folders.map((f) => ({ folder: f, docs: docs.filter((d) => d.folder_id === f.id) })),
    { folder: null, docs: docs.filter((d) => !d.folder_id) },
  ]

  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name ?? null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: mut(0.5) }}>Documentos que verá el cliente (planes, guías…), organizados en carpetas.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setFolderOpen(true)} style={{ background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 11, padding: '10px 14px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Carpeta
          </button>
          <button onClick={() => setUploadOpen(true)} style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 11, padding: '10px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Subir documento
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: mut(0.4), padding: 10 }}>Cargando…</div>
      ) : docs.length === 0 && folders.length === 0 ? (
        <div style={{ ...card, border: '1px dashed rgba(255,255,255,0.12)', padding: '34px 18px', textAlign: 'center', fontSize: 13, color: mut(0.45) }}>
          Aún no has subido documentos para este cliente.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {groups.map((g) => {
            if (g.folder === null && g.docs.length === 0) return null
            const isCollapsed = g.folder ? collapsed.has(g.folder.id) : false
            return (
              <div key={g.folder?.id ?? 'root'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <button onClick={() => g.folder && toggleFolder(g.folder.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: g.folder ? 'pointer' : 'default', fontFamily: 'inherit', padding: 0, color: colors.text }}>
                    {g.folder && <span style={{ fontSize: 11, color: mut(0.4) }}>{isCollapsed ? '▸' : '▾'}</span>}
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{g.folder ? `📁 ${g.folder.name}` : 'Sin carpeta'}</span>
                    <span style={{ fontSize: 11, color: mut(0.4) }}>{g.docs.length}</span>
                  </button>
                  {g.folder && (
                    <button onClick={() => removeFolder(g.folder!)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
                      Eliminar carpeta
                    </button>
                  )}
                </div>
                {!isCollapsed && (g.docs.length === 0 ? (
                  <div style={{ fontSize: 12, color: mut(0.35), padding: '2px 2px 6px' }}>Carpeta vacía. Sube un documento y elige esta carpeta.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {g.docs.map((d) => (
                      <DocRow
                        key={d.id}
                        d={d}
                        folders={folders}
                        currentFolderName={folderName(d.folder_id)}
                        onRemove={() => remove(d)}
                        onMove={async (fid) => {
                          await moveDocument(d.id, fid)
                          reload()
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {uploadOpen && (
        <UploadModal
          clientId={clientId}
          folders={folders}
          onClose={() => setUploadOpen(false)}
          onDone={() => {
            setUploadOpen(false)
            reload()
          }}
        />
      )}
      {folderOpen && (
        <FolderModal
          clientId={clientId}
          onClose={() => setFolderOpen(false)}
          onDone={() => {
            setFolderOpen(false)
            reload()
          }}
        />
      )}
    </div>
  )
}

function DocRow({
  d,
  folders,
  currentFolderName,
  onRemove,
  onMove,
}: {
  d: DocumentWithUrl
  folders: DocFolder[]
  currentFolderName: string | null
  onRemove: () => void
  onMove: (folderId: string | null) => void
}) {
  const st = catStyle(d.category)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, ...card, padding: '14px 15px' }}>
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
      {folders.length > 0 && (
        <select
          value={d.folder_id ?? ''}
          onChange={(e) => onMove(e.target.value || null)}
          title={currentFolderName ? `Carpeta: ${currentFolderName}` : 'Sin carpeta'}
          style={{ background: colors.surface2, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 8px', color: mut(0.7), fontFamily: 'inherit', fontSize: 11.5, outline: 'none', maxWidth: 130 }}
        >
          <option value="">Sin carpeta</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      )}
      {d.url && (
        <a href={d.url} target="_blank" rel="noreferrer" style={{ color: mut(0.6) }}>
          <Download />
        </a>
      )}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 15 }}>✕</button>
    </div>
  )
}

function FolderModal({ clientId, onClose, onDone }: { clientId: string; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const create = async () => {
    if (!name.trim()) return setErr('Ponle un nombre a la carpeta.')
    setBusy(true)
    setErr(null)
    try {
      await createFolder(clientId, name)
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo crear.')
      setBusy(false)
    }
  }

  return (
    <Modal title="Nueva carpeta" onClose={onClose}>
      <label style={{ display: 'block', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>Nombre</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Planes de entrenamiento" style={fieldStyle} autoFocus />
      </label>
      {err && <div style={{ fontSize: 12.5, color: '#f5a99f', marginTop: 10 }}>{err}</div>}
      <button onClick={create} disabled={busy} style={{ width: '100%', marginTop: 16, background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Creando…' : 'Crear carpeta'}
      </button>
    </Modal>
  )
}

function UploadModal({ clientId, folders, onClose, onDone }: { clientId: string; folders: DocFolder[]; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<DocCategory>('Entrenamiento')
  const [folderId, setFolderId] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [notify, setNotify] = useState(true)
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
      await addDocument(clientId, file, title, category, folderId || null)
      if (notify) {
        const nombre = title.trim() || file.name
        // Avisa al cliente por push + email (y le aparece en su campana).
        await sendNow(clientId, `📄 Tienes un nuevo documento: "${nombre}". Ábrelo en la sección Documentos de tu app.`).catch(() => {})
      }
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
        {UPLOAD_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            style={{ flex: 1, background: category === c.key ? c.bg : colors.surface2, color: category === c.key ? c.color : mut(0.6), border: `1px solid ${category === c.key ? c.color : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '10px 0', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
          >
            {c.key}
          </button>
        ))}
      </div>

      <label style={{ display: 'block', marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>CARPETA</span>
        <select value={folderId} onChange={(e) => setFolderId(e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>
          <option value="">Sin carpeta</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </label>

      <button onClick={() => inputRef.current?.click()} style={{ width: '100%', background: colors.surface2, color: file ? colors.text : mut(0.6), border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 10, padding: 14, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        {file ? `📎 ${file.name}` : 'Elegir archivo (PDF, imagen…)'}
      </button>
      <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, cursor: 'pointer' }}>
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} style={{ width: 17, height: 17, accentColor: colors.accent }} />
        <span style={{ fontSize: 12.5, color: mut(0.7) }}>Avisar al cliente (notificación push + email)</span>
      </label>

      {err && <div style={{ fontSize: 12.5, color: '#f5a99f', marginTop: 12 }}>{err}</div>}
      <button onClick={upload} disabled={busy} style={{ width: '100%', marginTop: 14, background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
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
