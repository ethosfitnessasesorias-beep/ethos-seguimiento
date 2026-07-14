import { useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import { catStyle, humanSize, listDocuments, type DocumentWithUrl } from '../../lib/documents'
import { Search, FileIcon, Download } from '../icons'

const chips = ['Todos', 'Entrenamiento', 'Nutrición', 'Guía']

function shortDate(iso: string): string {
  const M = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${Number(d)} ${M[Number(m) - 1]} ${y}`
}

export default function Documentos({ clientId }: { clientId: string }) {
  const [docs, setDocs] = useState<DocumentWithUrl[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Todos')

  useEffect(() => {
    listDocuments(clientId)
      .then(setDocs)
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }, [clientId])

  const shown = filter === 'Todos' ? docs : docs.filter((d) => d.category === filter)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: colors.surface1, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 13, padding: '11px 14px', marginBottom: 14 }}>
        <Search size={16} stroke={mut(0.4)} strokeWidth={2} />
        <span style={{ fontSize: 13, color: mut(0.4) }}>Buscar documento…</span>
      </div>

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
      ) : shown.length === 0 ? (
        <div style={{ background: colors.surface1, border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 14, padding: '30px 16px', textAlign: 'center', fontSize: 12.5, color: mut(0.4) }}>
          {docs.length === 0 ? 'Tu entrenador aún no ha subido documentos.' : 'No hay documentos en esta categoría.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map((d) => {
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
}
