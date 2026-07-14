import { useCallback, useEffect, useMemo, useState } from 'react'
import { colors, mut } from '../../theme'
import { EVENT_ORDER, EVENT_TYPES, listEvents, type CalEvent, type EventType } from '../../lib/events'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

interface Props {
  clientId: string
  onOpenForm: (formType: 'reporte' | 'cambio') => void
}

export default function Agenda({ clientId, onOpenForm }: Props) {
  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selDay, setSelDay] = useState(now.getDate())
  const [events, setEvents] = useState<CalEvent[]>([])

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDow = (new Date(year, month, 1).getDay() + 6) % 7 // 0 = Lunes
  const todayISO = iso(now.getFullYear(), now.getMonth(), now.getDate())

  const load = useCallback(async () => {
    const from = iso(year, month, 1)
    const to = iso(year, month, daysInMonth)
    try {
      setEvents(await listEvents(clientId, from, to))
    } catch {
      setEvents([])
    }
  }, [clientId, year, month, daysInMonth])

  useEffect(() => {
    load()
  }, [load])

  const byDay = useMemo(() => {
    const m: Record<number, CalEvent[]> = {}
    for (const e of events) {
      const d = Number(e.event_date.split('-')[2])
      ;(m[d] ||= []).push(e)
    }
    return m
  }, [events])

  const prev = () => {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else setMonth((mo) => mo - 1)
    setSelDay(1)
  }
  const next = () => {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else setMonth((mo) => mo + 1)
    setSelDay(1)
  }
  const goToday = () => {
    setYear(now.getFullYear())
    setMonth(now.getMonth())
    setSelDay(now.getDate())
  }

  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - startDow + 1
    const inM = day >= 1 && day <= daysInMonth
    const dayEvents = inM ? byDay[day] || [] : []
    const isToday = inM && iso(year, month, day) === todayISO
    const sel = inM && day === selDay
    return { i, day, inM, dayEvents, isToday, sel }
  })

  const selEvents = byDay[selDay] || []

  return (
    <div>
      {/* month header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NavBtn onClick={prev}>‹</NavBtn>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{MONTHS[month]} {year}</div>
          <NavBtn onClick={next}>›</NavBtn>
        </div>
        <button onClick={goToday} style={{ fontSize: 12, fontWeight: 600, background: colors.accent, color: '#fff', border: 'none', borderRadius: 9, padding: '7px 13px', cursor: 'pointer' }}>
          Hoy
        </button>
      </div>

      {/* legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
        {EVENT_ORDER.map((k) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: mut(0.65) }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: EVENT_TYPES[k].color }} />
            {EVENT_TYPES[k].label}
          </span>
        ))}
      </div>

      {/* grid */}
      <div style={{ background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 13 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
          {weekdays.map((w, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: mut(0.35) }}>{w}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
          {cells.map((c) => (
            <button
              key={c.i}
              onClick={() => c.inM && setSelDay(c.day)}
              style={{
                aspectRatio: '1 / 1.15',
                background: c.sel ? 'rgba(219,24,9,0.16)' : 'transparent',
                border: c.sel ? `1px solid ${colors.accent}` : c.isToday ? '1px solid rgba(255,255,255,0.14)' : '1px solid transparent',
                borderRadius: 9,
                cursor: c.inM ? 'pointer' : 'default',
                padding: '4px 0 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <span style={{ fontSize: 11.5, fontWeight: 600, color: c.inM ? (c.sel ? colors.text : mut(0.82)) : 'transparent' }}>
                {c.inM ? c.day : ''}
              </span>
              <div style={{ display: 'flex', gap: 2 }}>
                {c.dayEvents.slice(0, 3).map((e, k) => (
                  <span key={k} style={{ width: 5, height: 5, borderRadius: '50%', background: EVENT_TYPES[e.type as EventType]?.color ?? '#888' }} />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* day agenda */}
      <div style={{ margin: '18px 4px 10px', fontSize: 13, fontWeight: 700 }}>
        Agenda · {selDay} de {MONTHS[month].toLowerCase()}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {selEvents.length === 0 && (
          <div style={{ textAlign: 'center', fontSize: 12, color: mut(0.35), padding: 22, background: colors.surface1, borderRadius: 12 }}>
            Sin eventos este día
          </div>
        )}
        {selEvents.map((e) => {
          const cfg = EVENT_TYPES[e.type as EventType]
          return (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 13, background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${cfg.color}`, borderRadius: 12, padding: '13px 15px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{e.title || cfg.label}</div>
                {e.title && <div style={{ fontSize: 10.5, color: mut(0.4), marginTop: 1 }}>{cfg.label}</div>}
                {e.detail && <div style={{ fontSize: 11, color: mut(0.45), marginTop: 2 }}>{e.detail}</div>}
                {cfg.form && (
                  <button
                    onClick={() => onOpenForm(cfg.form!)}
                    style={{ marginTop: 8, background: cfg.color, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '6px 12px', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Rellenar ahora ›
                  </button>
                )}
              </div>
              {e.time && <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>{e.time}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NavBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: 32, height: 32, borderRadius: 9, background: colors.surface2, border: '1px solid rgba(255,255,255,0.08)', color: colors.text, cursor: 'pointer', fontSize: 14 }}>
      {children}
    </button>
  )
}
