import { colors, mut } from '../../theme'
import { documents } from '../../data'
import { Search, FileIcon, Download } from '../icons'

const chips = ['Todos', 'Entrenamiento', 'Nutrición', 'Guías']

export default function Documentos() {
  return (
    <div>
      {/* search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: colors.surface1,
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 13,
          padding: '11px 14px',
          marginBottom: 14,
        }}
      >
        <Search size={16} stroke={mut(0.4)} strokeWidth={2} />
        <span style={{ fontSize: 13, color: mut(0.4) }}>Buscar documento…</span>
      </div>

      {/* filter chips */}
      <div className="om-scroll" style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
        {chips.map((c, i) => (
          <span
            key={c}
            style={{
              flex: 'none',
              fontSize: 11.5,
              fontWeight: 600,
              background: i === 0 ? colors.accent : colors.surface2,
              color: i === 0 ? '#fff' : undefined,
              border: i === 0 ? undefined : '1px solid rgba(255,255,255,0.08)',
              padding: '7px 14px',
              borderRadius: 999,
            }}
          >
            {c}
          </span>
        ))}
      </div>

      {/* list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {documents.map((d) => (
          <div
            key={d.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 13,
              background: colors.surface1,
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14,
              padding: '14px 15px',
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                flex: 'none',
                borderRadius: 11,
                background: d.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileIcon size={19} stroke={d.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{d.name}</div>
              <div style={{ fontSize: 11, color: mut(0.45), marginTop: 3 }}>
                <span style={{ color: d.color, fontWeight: 600 }}>{d.type}</span> · {d.date} · {d.size}
              </div>
            </div>
            <Download />
          </div>
        ))}
      </div>
    </div>
  )
}
