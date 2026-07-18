import { useCallback, useEffect, useState } from 'react'
import { colors, mut } from '../../theme'
import {
  deleteCustomForm,
  listCustomForms,
  saveCustomForm,
  type CustomForm,
  type Question,
  type QuestionKind,
} from '../../lib/forms'

const card: React.CSSProperties = { background: colors.surface1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }
const field: React.CSSProperties = { width: '100%', background: colors.surface2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 12px', color: colors.text, fontFamily: 'inherit', fontSize: 14, outline: 'none' }
const label: React.CSSProperties = { fontSize: 11, color: mut(0.5), fontWeight: 600, display: 'block', marginBottom: 5 }

const KINDS: { k: QuestionKind; label: string }[] = [
  { k: 'short', label: 'Respuesta corta' },
  { k: 'long', label: 'Respuesta larga' },
  { k: 'scale', label: 'Escala 1–10' },
  { k: 'yesno', label: 'Sí / No' },
  { k: 'date', label: 'Fecha' },
]
const COLORS = ['#db1809', '#2dd4bf', '#a78bfa', '#f5a623', '#4ade80']

export default function FormulariosTrainer() {
  const [forms, setForms] = useState<CustomForm[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<CustomForm | 'new' | null>(null)

  const reload = useCallback(() => {
    listCustomForms().then(setForms).catch(() => setForms([])).finally(() => setLoading(false))
  }, [])
  useEffect(reload, [reload])

  const remove = async (f: CustomForm) => {
    if (!confirm(`¿Eliminar el formulario «${f.title}»? (Los ya enviados por clientes se conservan.)`)) return
    await deleteCustomForm(f.id)
    reload()
  }

  if (editing) {
    return <FormBuilder initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
        <div style={{ fontSize: 26, fontWeight: 700 }}>Formularios</div>
        <button onClick={() => setEditing('new')} style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 11, padding: '10px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', flex: 'none' }}>
          + Nuevo formulario
        </button>
      </div>
      <div style={{ fontSize: 13.5, color: mut(0.5), marginBottom: 22 }}>
        Crea formularios propios. Aparecerán en la app de todos tus clientes para que los rellenen.
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: mut(0.4) }}>Cargando…</div>
      ) : forms.length === 0 ? (
        <div style={{ ...card, border: '1px dashed rgba(255,255,255,0.12)', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Aún no has creado formularios</div>
          <div style={{ fontSize: 13, color: mut(0.5), lineHeight: 1.6, maxWidth: 460, margin: '0 auto' }}>
            Además del reporte semanal y el cambio de planificación (que ya vienen incluidos), aquí puedes crear los tuyos desde cero.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
          {forms.map((f) => (
            <div key={f.id} style={{ ...card, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: f.color || colors.accent, flex: 'none' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{f.title}</div>
                  <div style={{ fontSize: 11, color: mut(0.45), marginTop: 2 }}>{f.questions.length} pregunta{f.questions.length === 1 ? '' : 's'}</div>
                </div>
                <button onClick={() => setEditing(f)} style={{ background: colors.surface2, color: colors.text, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '8px 13px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Editar</button>
                <button onClick={() => remove(f)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '8px 11px', color: mut(0.55), cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FormBuilder({ initial, onClose, onSaved }: { initial: CustomForm | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [intro, setIntro] = useState(initial?.intro ?? '')
  const [color, setColor] = useState(initial?.color ?? COLORS[0])
  const [questions, setQuestions] = useState<Question[]>(initial?.questions ?? [])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const addQ = () => setQuestions((qs) => [...qs, { id: crypto.randomUUID(), q: '', kind: 'short', required: true }])
  const setQ = (id: string, patch: Partial<Question>) => setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  const delQ = (id: string) => setQuestions((qs) => qs.filter((q) => q.id !== id))
  const move = (i: number, dir: -1 | 1) =>
    setQuestions((qs) => {
      const j = i + dir
      if (j < 0 || j >= qs.length) return qs
      const c = [...qs]
      ;[c[i], c[j]] = [c[j], c[i]]
      return c
    })

  const save = async () => {
    if (!title.trim()) return setErr('Ponle un título al formulario.')
    const valid = questions.filter((q) => q.q.trim())
    if (valid.length === 0) return setErr('Añade al menos una pregunta.')
    setBusy(true)
    setErr(null)
    try {
      await saveCustomForm({ id: initial?.id, title: title.trim(), intro: intro.trim(), color, questions: valid.map((q) => ({ ...q, q: q.q.trim() })) })
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar.')
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: mut(0.6), fontFamily: 'inherit', fontSize: 13, cursor: 'pointer', padding: '0 0 12px' }}>‹ Volver a formularios</button>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>{initial ? 'Editar formulario' : 'Nuevo formulario'}</div>

      <div style={{ ...card, padding: 18, marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={label}>Título</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Revisión mensual" style={field} />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={label}>Descripción breve (opcional)</span>
          <input value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="Aparece bajo el título" style={field} />
        </label>
        <span style={label}>Color</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: 8, background: c, border: color === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
          ))}
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Preguntas</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {questions.map((q, i) => (
          <div key={q.id} style={{ ...card, padding: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 2 }}>
                <button onClick={() => move(i, -1)} style={arrowBtn}>▲</button>
                <button onClick={() => move(i, 1)} style={arrowBtn}>▼</button>
              </div>
              <div style={{ flex: 1 }}>
                <input value={q.q} onChange={(e) => setQ(q.id, { q: e.target.value })} placeholder={`Pregunta ${i + 1}`} style={{ ...field, marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select value={q.kind} onChange={(e) => setQ(q.id, { kind: e.target.value as QuestionKind })} style={{ ...field, width: 'auto', padding: '8px 10px', fontSize: 12.5 }}>
                    {KINDS.map((k) => (
                      <option key={k.k} value={k.k}>{k.label}</option>
                    ))}
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: mut(0.7), cursor: 'pointer' }}>
                    <input type="checkbox" checked={q.required !== false} onChange={(e) => setQ(q.id, { required: e.target.checked })} style={{ accentColor: colors.accent }} />
                    Obligatoria
                  </label>
                  <button onClick={() => delQ(q.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: mut(0.45), cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit' }}>Eliminar</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={addQ} style={{ marginTop: 12, width: '100%', background: colors.surface2, color: colors.text, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 10, padding: 12, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        + Añadir pregunta
      </button>

      {err && <div style={{ fontSize: 12.5, color: '#f5a99f', marginTop: 12 }}>{err}</div>}
      <button onClick={save} disabled={busy} style={{ width: '100%', marginTop: 16, background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Guardando…' : 'Guardar formulario'}
      </button>
    </div>
  )
}

const arrowBtn: React.CSSProperties = { background: colors.surface2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: mut(0.5), cursor: 'pointer', fontSize: 9, width: 22, height: 18, padding: 0, lineHeight: 1 }
