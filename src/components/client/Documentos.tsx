import { useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import { catStyle, humanSize, listDocuments, listFolders, type DocFolder, type DocumentWithUrl } from '../../lib/documents'
import { Search, FileIcon, Download } from '../icons'

const chips = ['Todos', 'Entrenamiento', 'Nutrición', 'Guía', 'Contrato']

function shortDate(iso: string): string {
  const M = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${Number(d)} ${M[Number(m) - 1]} ${y}`
}

export default function Documentos({ clientId }: { clientId: string }) {
  const [docs, setDocs] = useState<DocumentWithUrl[]>([])
  const [folders, setFolders] = useState<DocFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Todos')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [folderSort, setFolderSort] = useState<'name' | 'date'>('date')
  const [folderFilter, setFolderFilter] = useState('')

  useEffect(() => {
    Promise.all([listDocuments(clientId), listFolders(clientId)])
      .then(([d, f]) => {
        setDocs(d)
        setFolders(f)
        setCollapsed(new Set(f.map((x) => x.id))) // carpetas plegadas por defecto
      })
      .catch(() => {
        setDocs([])
        setFolders([])
      })
      .finally(() => setLoading(false))
  }, [clientId])

  const toggleFolder = (id: string) =>
    setCollapsed((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const shown = filter === 'Todos' ? docs : docs.filter((d) => d.category === filter)

  // Agrupa por carpeta (ordenadas/filtradas); las sueltas, en "General".
  const q = folderFilter.trim().toLowerCase()
  const sortedFolders = [...folders].sort((a, b) =>
    folderSort === 'date' ? (a.created_at < b.created_at ? 1 : -1) : a.name.localeCompare(b.name),
  )
  const shownFolders = q ? sortedFolders.filter((f) => f.name.toLowerCase().includes(q)) : sortedFolders
  const groups: { name: string; id: string | null; docs: DocumentWithUrl[] }[] = [
    ...shownFolders.map((f) => ({ name: f.name, id: f.id as string | null, docs: shown.filter((d) => d.folder_id === f.id) })),
    ...(q ? [] : [{ name: 'General', id: null as string | null, docs: shown.filter((d) => !d.folder_id) }]),
  ].filter((g) => g.docs.length > 0)

  return (
    <div>
      {folders.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, background: colors.surface1, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 13, padding: '10px 12px' }}>
            <Search size={15} stroke={mut(0.4)} strokeWidth={2} />
            <input value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)} placeholder="Buscar carpeta…" style={{ flex: 1, background: 'none', border: 'none', color: colors.text, fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 3, background: colors.surface2, borderRadius: 999, padding: 3, flex: 'none' }}>
            {([['date', 'Fecha'], ['name', 'A-Z']] as ['date' | 'name', string][]).map(([k, l]) => (
              <button key={k} onClick={() => setFolderSort(k)} style={{ background: folderSort === k ? colors.accent : 'transparent', color: folderSort === k ? '#fff' : mut(0.6), border: 'none', borderRadius: 999, padding: '7px 12px', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>{l}</button>
            ))}
          </div>
        </div>
      )}

      <div className="om-scroll" style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            style={{ flex: 'none', fontSize: 11.5, fontWeight: 600, background: filter === c ? colors.accent : colors.surface2, color: filter === c ? '#fff' : mut(0.7), border: filter === c ? 'none' : '1px solid rgba(255,255,255,0.08)', padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {c === 'Guía' ? 'Guías' : c}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ fontSize: 12.5, color: mut(0.4), padding: 10 }}>Cargando documentos…</div>
      ) : groups.length === 0 ? (
        <div style={{ background: colors.surface1, border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 14, padding: '30px 16px', textAlign: 'center', fontSize: 12.5, color: mut(0.4) }}>
          {docs.length === 0 ? 'Tu entrenador aún no ha subido documentos.' : 'No hay documentos en esta categoría.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {groups.map((g) => {
            const isCollapsed = g.id ? collapsed.has(g.id) : false
            return (
            <div key={g.id ?? 'general'}>
              <button onClick={() => g.id && toggleFolder(g.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: g.id ? 'pointer' : 'default', fontFamily: 'inherit', padding: 0, marginBottom: 9, color: mut(0.6) }}>
                {g.id && <span style={{ fontSize: 11, color: mut(0.4) }}>{isCollapsed ? '▸' : '▾'}</span>}
                <span style={{ fontSize: 12, fontWeight: 700 }}>{g.id ? `📁 ${g.name}` : 'General'}</span>
                <span style={{ fontSize: 11, color: mut(0.4) }}>{g.docs.length}</span>
              </button>
              {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {g.docs.map((d) => {
                  const st = catStyle(d.category)
                  return (
                    <a
                      key={d.id}
                      href={d.url ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 13, background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 15px', textDecoration: 'none', color: colors.text }}
                    >
                      <div style={{ width: 42, height: 42, flex: 'none', borderRadius: 11, background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileIcon size={19} stroke={st.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{d.title}</div>
                        <div style={{ fontSize: 11, color: mut(0.45), marginTop: 3 }}>
                          <span style={{ color: st.color, fontWeight: 600 }}>{d.category}</span> · {shortDate(d.created_at)}
                          {d.size_bytes ? ` · ${humanSize(d.size_bytes)}` : ''}
                        </div>
                      </div>
                      <Download />
                    </a>
                  )
                })}
              </div>
              )}
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
