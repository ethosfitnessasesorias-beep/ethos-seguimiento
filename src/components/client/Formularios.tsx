import { useCallback, useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import type { Profile } from '../../lib/db'
import {
  FORM_TEMPLATES,
  listSubmissions,
  submitForm,
  type Answer,
  type FormSubmission,
  type FormTemplate,
  type Question,
} from '../../lib/forms'

const card: React.CSSProperties = {
  background: colors.surface1,
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 16,
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Formularios({ profile }: { profile: Profile }) {
  const [filling, setFilling] = useState<FormTemplate | null>(null)
  const [subs, setSubs] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      setSubs(await listSubmissions(profile.id))
    } finally {
      setLoading(false)
    }
  }, [profile.id])

  useEffect(() => {
    reload()
  }, [reload])

  if (filling) {
    return (
      <FormFill
        template={filling}
        profile={profile}
        onCancel={() => setFilling(null)}
        onSent={async () => {
          setFilling(null)
          setLoading(true)
          await reload()
        }}
      />
    )
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: mut(0.5), margin: '2px 4px 12px' }}>Rellena tus formularios de seguimiento.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FORM_TEMPLATES.map((t) => (
          <button
            key={t.type}
            onClick={() => setFilling(t)}
            style={{ ...card, textAlign: 'left', padding: '16px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 13, fontFamily: 'inherit' }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 3, background: t.color, flex: 'none' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{t.title}</div>
              <div style={{ fontSize: 11.5, color: mut(0.5), marginTop: 2 }}>{t.intro}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: colors.accent }}>Rellenar ›</span>
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, letterSpacing: 1.5, color: mut(0.4), fontWeight: 600, margin: '22px 4px 10px' }}>
        MIS ENVÍOS
      </div>
      {loading ? (
        <div style={{ fontSize: 12.5, color: mut(0.4), padding: '6px 4px' }}>Cargando…</div>
      ) : subs.length === 0 ? (
        <div style={{ ...card, padding: '20px 16px', fontSize: 12.5, color: mut(0.4), textAlign: 'center' }}>
          Aún no has enviado ningún formulario.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {subs.map((s) => (
            <SentRow key={s.id} s={s} />
          ))}
        </div>
      )}
    </div>
  )
}

function SentRow({ s }: { s: FormSubmission }) {
  const [open, setOpen] = useState(false)
  const d = s.created_at.slice(0, 10)
  return (
    <div style={{ ...card, padding: '13px 15px' }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit', padding: 0 }}>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: colors.text }}>{s.form_title}</div>
          <div style={{ fontSize: 11, color: mut(0.45), marginTop: 2 }}>{d}</div>
        </div>
        {!s.reviewed && (
          <span style={{ fontSize: 10, fontWeight: 600, color: colors.accent, background: 'rgba(219,24,9,0.14)', padding: '2px 8px', borderRadius: 999 }}>Enviado</span>
        )}
        {s.reviewed && (
          <span style={{ fontSize: 10, fontWeight: 600, color: colors.green, background: 'rgba(74,222,128,0.12)', padding: '2px 8px', borderRadius: 999 }}>Revisado</span>
        )}
        <span style={{ color: mut(0.4), fontSize: 13 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {s.answers.map((a, i) => (
            <div key={i}>
              <div style={{ fontSize: 11, color: mut(0.5), marginBottom: 2 }}>{a.q}</div>
              <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.45 }}>{a.a || '—'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Rellenar un formulario ----------
function FormFill({ template, profile, onCancel, onSent }: { template: FormTemplate; profile: Profile; onCancel: () => void; onSent: () => void }) {
  const [ans, setAns] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const q of template.questions) {
      if (q.prefill === 'full_name') init[q.id] = profile.full_name ?? ''
      else if (q.prefill === 'today') init[q.id] = todayISO()
      else init[q.id] = ''
    }
    return init
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const set = (id: string, v: string) => setAns((s) => ({ ...s, [id]: v }))

  const send = async () => {
    const missing = template.questions.filter((q) => q.required !== false && !ans[q.id]?.trim())
    if (missing.length) {
      setErr(`Faltan ${missing.length} respuesta(s) por rellenar.`)
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const answers: Answer[] = template.questions.map((q) => ({ q: q.q, a: ans[q.id]?.trim() ?? '' }))
      await submitForm(profile.id, template, answers)
      onSent()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo enviar.')
      setBusy(false)
    }
  }

  return (
    <div>
      <button onClick={onCancel} style={{ background: 'none', border: 'none', color: mut(0.6), fontFamily: 'inherit', fontSize: 13, cursor: 'pointer', padding: '0 0 12px' }}>
        ‹ Volver
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: template.color }} />
        <div style={{ fontSize: 17, fontWeight: 700 }}>{template.title}</div>
      </div>
      <div style={{ fontSize: 12, color: mut(0.5), marginBottom: 18 }}>{template.intro}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {template.questions.map((q) => (
          <QuestionField key={q.id} q={q} value={ans[q.id] ?? ''} onChange={(v) => set(q.id, v)} />
        ))}
      </div>

      {err && (
        <div style={{ fontSize: 12.5, color: '#f5a99f', background: 'rgba(219,24,9,0.12)', border: '1px solid rgba(219,24,9,0.3)', borderRadius: 10, padding: '10px 12px', marginTop: 14 }}>
          {err}
        </div>
      )}

      <button
        onClick={send}
        disabled={busy}
        style={{ width: '100%', margin: '18px 0 6px', background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}
      >
        {busy ? 'Enviando…' : 'Enviar formulario'}
      </button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
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

function QuestionField({ q, value, onChange }: { q: Question; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 7, lineHeight: 1.35 }}>
        {q.q}
        {q.required === false && <span style={{ color: mut(0.35), fontWeight: 500 }}> (opcional)</span>}
      </div>
      {q.kind === 'long' && (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
      )}
      {q.kind === 'short' && <input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />}
      {q.kind === 'date' && <input type="date" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />}
      {q.kind === 'yesno' && (
        <div style={{ display: 'flex', gap: 8 }}>
          {['Sí', 'No'].map((opt) => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              style={{ flex: 1, background: value === opt ? 'rgba(219,24,9,0.16)' : colors.surface2, color: value === opt ? colors.text : mut(0.6), border: `1px solid ${value === opt ? 'rgba(219,24,9,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '11px 0', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      {q.kind === 'scale' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10,1fr)', gap: 4 }}>
          {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
            <button
              key={n}
              onClick={() => onChange(n)}
              style={{ aspectRatio: '1', background: value === n ? colors.accent : colors.surface2, color: value === n ? '#fff' : mut(0.6), border: `1px solid ${value === n ? colors.accent : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
