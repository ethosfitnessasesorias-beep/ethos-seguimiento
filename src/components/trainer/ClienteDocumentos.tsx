import { useCallback, useEffect, useRef, useState } from 'react'
import { colors, mut } from '../../theme'
import {
  addDocument,
  catStyle,
  createFolder,
  deleteDocument,
  deleteFolder,
  downloadDocument,
  folderTree,
  folderWithDescendants,
  humanSize,
  isViewableDoc,
  moveFolder,
  openDocumentInTab,
  setDocumentCategory,
  listDocuments,
  listFolders,
  moveDocument,
  UPLOAD_CATEGORIES,
  type DocCategory,
  type DocFolder,
  type FolderNode,
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
  // null = cerrado · '' = crear en la raíz · '<id>' = crear dentro de esa carpeta
  const [folderOpen, setFolderOpen] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [folderSort, setFolderSort] = useState<'name' | 'date'>('date')
  const [folderFilter, setFolderFilter] = useState('')

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
    if (!confirm(`¿Eliminar la carpeta «${f.name}» y sus subcarpetas? Los documentos NO se borran: quedan sin carpeta.`)) return
    await deleteFolder(f.id)
    reload()
  }

  // Carpetas en árbol (padres → hijas, con su profundidad). El filtro de
  // búsqueda muestra también las carpetas madre para no perder el contexto.
  const q = folderFilter.trim().toLowerCase()
  const tree = folderTree(folders)
  const matches = q ? tree.filter((f) => f.path.toLowerCase().includes(q)) : tree
  const keepIds = new Set<string>()
  for (const m of matches) {
    keepIds.add(m.id)
    let p = m.parent_id
    while (p) {
      keepIds.add(p)
      p = folders.find((f) => f.id === p)?.parent_id ?? null
    }
  }
  const shownFolders = q ? tree.filter((f) => keepIds.has(f.id)) : tree
  const groups: { folder: FolderNode | null; docs: DocumentWithUrl[] }[] = [
    ...shownFolders.map((f) => ({ folder: f as FolderNode | null, docs: docs.filter((d) => d.folder_id === f.id) })),
    ...(q ? [] : [{ folder: null as FolderNode | null, docs: docs.filter((d) => !d.folder_id) }]),
  ]

  const folderName = (id: string | null) => tree.find((f) => f.id === id)?.path ?? null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: mut(0.5) }}>Documentos que verá el cliente (planes, guías…), organizados en carpetas.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setFolderOpen('')} style={{ background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 11, padding: '10px 14px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Carpeta
          </button>
          <button onClick={() => setUploadOpen(true)} style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 11, padding: '10px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Subir documento
          </button>
        </div>
      </div>

      {folders.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)} placeholder="🔍 Buscar carpeta…" style={{ background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '9px 12px', fontFamily: 'inherit', fontSize: 13, outline: 'none', flex: 1, minWidth: 160 }} />
          <div style={{ display: 'flex', gap: 4, background: colors.surface2, borderRadius: 999, padding: 3 }}>
            {([['date', 'Fecha'], ['name', 'Nombre']] as ['date' | 'name', string][]).map(([k, l]) => (
              <button key={k} onClick={() => setFolderSort(k)} style={{ background: folderSort === k ? colors.accent : 'transparent', color: folderSort === k ? '#fff' : mut(0.6), border: 'none', borderRadius: 999, padding: '7px 14px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: mut(0.4), padding: 10 }}>Cargando…</div>
      ) : docs.length === 0 && folders.length === 0 ? (
        <div style={{ ...card, border: '1px dashed rgba(255,255,255,0.12)', padding: '34px 18px', textAlign: 'center', fontSize: 13, color: mut(0.45) }}>
          Aún no has subido documentos para este cliente.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {groups.map((g) => {
            if (g.folder === null && g.docs.length === 0) return null
            const isCollapsed = g.folder ? collapsed.has(g.folder.id) : false
            const depth = g.folder?.depth ?? 0
            return (
              <div key={g.folder?.id ?? 'root'} style={{ marginLeft: depth * 22, borderLeft: depth > 0 ? '1px solid rgba(255,255,255,0.07)' : undefined, paddingLeft: depth > 0 ? 12 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => g.folder && toggleFolder(g.folder.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: g.folder ? 'pointer' : 'default', fontFamily: 'inherit', padding: 0, color: colors.text }}>
                    {g.folder && <span style={{ fontSize: 11, color: mut(0.4) }}>{isCollapsed ? '▸' : '▾'}</span>}
                    <span style={{ fontSize: depth > 0 ? 12.5 : 13, fontWeight: 700 }}>{g.folder ? `📁 ${g.folder.name}` : 'Sin carpeta'}</span>
                    <span style={{ fontSize: 11, color: mut(0.4) }}>{g.docs.length}</span>
                  </button>
                  {g.folder && (
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {g.folder.depth < 4 && (
                        <button onClick={() => setFolderOpen(g.folder!.id)} title="Crear una subcarpeta dentro de esta" style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '4px 9px', color: mut(0.6), cursor: 'pointer', fontFamily: 'inherit', fontSize: 11 }}>
                          + Subcarpeta
                        </button>
                      )}
                      <select
                        value={g.folder.parent_id ?? ''}
                        onChange={async (e) => {
                          await moveFolder(g.folder!.id, e.target.value || null)
                          reload()
                        }}
                        title="Mover esta carpeta dentro de otra"
                        style={{ background: colors.surface2, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '4px 7px', color: mut(0.6), fontFamily: 'inherit', fontSize: 11, outline: 'none', maxWidth: 150, cursor: 'pointer' }}
                      >
                        <option value="">— En la raíz —</option>
                        {tree
                          .filter((f) => !folderWithDescendants(folders, g.folder!.id).includes(f.id) && f.depth < 4)
                          .map((f) => (
                            <option key={f.id} value={f.id}>{'— '.repeat(f.depth)}{f.name}</option>
                          ))}
                      </select>
                      <button onClick={() => removeFolder(g.folder!)} style={{ background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
                        Eliminar
                      </button>
                    </div>
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
                        folders={tree}
                        currentFolderName={folderName(d.folder_id)}
                        onRemove={() => remove(d)}
                        onMove={async (fid) => {
                          await moveDocument(d.id, fid)
                          reload()
                        }}
                        onCategory={async (cat) => {
                          await setDocumentCategory(d.id, cat)
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
          folders={tree}
          onClose={() => setUploadOpen(false)}
          onDone={() => {
            setUploadOpen(false)
            reload()
          }}
        />
      )}
      {folderOpen !== null && (
        <FolderModal
          clientId={clientId}
          parentId={folderOpen || null}
          parentName={folderOpen ? tree.find((f) => f.id === folderOpen)?.path ?? null : null}
          onClose={() => setFolderOpen(null)}
          onDone={() => {
            setFolderOpen(null)
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
  onCategory,
}: {
  d: DocumentWithUrl
  folders: FolderNode[]
  currentFolderName: string | null
  onRemove: () => void
  onMove: (folderId: string | null) => void
  onCategory: (cat: DocCategory) => void
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
          {d.created_at.slice(0, 10)}
          {d.size_bytes ? ` · ${humanSize(d.size_bytes)}` : ''}
        </div>
      </div>
      {/* categoría editable (el contrato es fijo) */}
      {d.category === 'Contrato' ? (
        <span style={{ fontSize: 11.5, fontWeight: 600, color: st.color, background: st.bg, borderRadius: 8, padding: '6px 9px' }}>Contrato</span>
      ) : (
        <select
          value={d.category}
          onChange={(e) => onCategory(e.target.value as DocCategory)}
          title="Cambiar categoría"
          style={{ background: st.bg, border: `1px solid ${st.color}`, borderRadius: 8, padding: '6px 8px', color: st.color, fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, outline: 'none', maxWidth: 130, cursor: 'pointer' }}
        >
          {UPLOAD_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key} style={{ background: '#111', color: '#eee' }}>{c.key}</option>
          ))}
        </select>
      )}
      {folders.length > 0 && (
        <select
          value={d.folder_id ?? ''}
          onChange={(e) => onMove(e.target.value || null)}
          title={currentFolderName ? `Carpeta: ${currentFolderName}` : 'Cambiar de carpeta'}
          style={{ background: colors.surface2, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 8px', color: mut(0.7), fontFamily: 'inherit', fontSize: 11.5, outline: 'none', maxWidth: 130, cursor: 'pointer' }}
        >
          <option value="">Sin carpeta</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>{'\u00a0\u00a0'.repeat(f.depth)}📁 {f.name}</option>
          ))}
        </select>
      )}
      {isViewableDoc(d) ? (
        <button
          onClick={() => openDocumentInTab(d).catch(() => alert('No se pudo abrir el documento. Vuelve a intentarlo.'))}
          title="Abrir"
          style={{ background: 'none', border: 'none', color: mut(0.6), cursor: 'pointer', padding: 0 }}
        >
          <Download />
        </button>
      ) : (
        <button
          onClick={() => downloadDocument(d).catch(() => alert('No se pudo descargar el documento.'))}
          title="Descargar"
          style={{ background: 'none', border: 'none', color: mut(0.6), cursor: 'pointer', padding: 0 }}
        >
          <Download />
        </button>
      )}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 15 }}>✕</button>
    </div>
  )
}

function FolderModal({ clientId, parentId, parentName, onClose, onDone }: { clientId: string; parentId: string | null; parentName: string | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const create = async () => {
    if (!name.trim()) return setErr('Ponle un nombre a la carpeta.')
    setBusy(true)
    setErr(null)
    try {
      await createFolder(clientId, name, parentId)
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo crear.')
      setBusy(false)
    }
  }

  return (
    <Modal title={parentName ? 'Nueva subcarpeta' : 'Nueva carpeta'} onClose={onClose}>
      {parentName && (
        <div style={{ fontSize: 12, color: mut(0.55), background: colors.surface2, borderRadius: 9, padding: '8px 11px', marginBottom: 12 }}>
          Se creará dentro de <b style={{ color: colors.text }}>📁 {parentName}</b>
        </div>
      )}
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

function UploadModal({ clientId, folders, onClose, onDone }: { clientId: string; folders: FolderNode[]; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<DocCategory>('Entrenamiento')
  const [folderId, setFolderId] = useState<string>('')
  const [files, setFiles] = useState<File[]>([])
  const [notify, setNotify] = useState(true)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sube todos los archivos seleccionados con LA MISMA categoría y carpeta.
  // Con varios archivos, cada uno usa su propio nombre como título.
  const upload = async () => {
    if (files.length === 0) {
      setErr('Elige al menos un archivo.')
      return
    }
    setBusy(true)
    setErr(null)
    const failed: File[] = []
    for (let i = 0; i < files.length; i++) {
      setProgress(i + 1)
      const f = files[i]
      try {
        await addDocument(clientId, f, files.length === 1 ? title : '', category, folderId || null)
      } catch {
        failed.push(f)
      }
    }
    const okCount = files.length - failed.length
    if (okCount > 0 && notify) {
      // Un solo aviso al cliente aunque se suban varios (push + email + campana).
      const body =
        okCount === 1
          ? `📄 Tienes un nuevo documento: "${files.length === 1 ? title.trim() || files[0].name : 'nuevo documento'}". Ábrelo en la sección Documentos de tu app.`
          : `📄 Tienes ${okCount} documentos nuevos. Ábrelos en la sección Documentos de tu app.`
      await sendNow(clientId, body).catch(() => {})
    }
    if (failed.length > 0) {
      setFiles(failed)
      setProgress(0)
      setBusy(false)
      setErr(`No se pudieron subir ${failed.length} archivo(s): ${failed.map((f) => f.name).join(', ')}. Pulsa de nuevo para reintentar solo esos.`)
      return
    }
    onDone()
  }

  return (
    <Modal title="Subir documentos" onClose={onClose}>
      <label style={{ display: 'block', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }}>
          Título {files.length > 1 ? '(con varios archivos se usa el nombre de cada uno)' : '(opcional)'}
        </span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Plan de entrenamiento · Bloque 3" disabled={files.length > 1} style={{ ...fieldStyle, opacity: files.length > 1 ? 0.45 : 1 }} />
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
            <option key={f.id} value={f.id}>{'\u00a0\u00a0'.repeat(f.depth)}{f.depth > 0 ? '└ ' : ''}{f.name}</option>
          ))}
        </select>
      </label>

      <button onClick={() => inputRef.current?.click()} style={{ width: '100%', background: colors.surface2, color: files.length ? colors.text : mut(0.6), border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 10, padding: 14, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        {files.length === 0 ? 'Elegir archivos (puedes seleccionar varios a la vez)' : files.length === 1 ? `📎 ${files[0].name}` : `📎 ${files.length} archivos seleccionados`}
      </button>
      <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
      {files.length > 1 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 120, overflowY: 'auto' }} className="om-scroll">
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: mut(0.6) }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {f.name}</span>
              <button onClick={() => setFiles((s) => s.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: mut(0.4), cursor: 'pointer', fontSize: 12, padding: 0 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, cursor: 'pointer' }}>
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} style={{ width: 17, height: 17, accentColor: colors.accent }} />
        <span style={{ fontSize: 12.5, color: mut(0.7) }}>Avisar al cliente (un solo aviso, push + email)</span>
      </label>

      {err && <div style={{ fontSize: 12.5, color: '#f5a99f', marginTop: 12 }}>{err}</div>}
      <button onClick={upload} disabled={busy} style={{ width: '100%', marginTop: 14, background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? `Subiendo ${progress}/${files.length}…` : files.length > 1 ? `Subir ${files.length} documentos` : 'Subir documento'}
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
