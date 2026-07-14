import { supabase } from './supabase'

// ---- Plantillas de formularios (preguntas reales del entrenador) ----
export type QuestionKind = 'short' | 'long' | 'scale' | 'yesno' | 'date'

export interface Question {
  id: string
  q: string
  kind: QuestionKind
  /** Si es false, no es obligatoria. Por defecto todas lo son. */
  required?: boolean
  prefill?: 'full_name' | 'today'
}

export interface FormTemplate {
  type: string
  title: string
  color: string
  intro: string
  questions: Question[]
}

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    type: 'reporte',
    title: 'Reporte semanal o bisemanal',
    color: '#2dd4bf',
    intro: 'Feedback de la semana para ajustar tu planificación.',
    questions: [
      { id: 'nombre', q: 'Nombre y apellidos', kind: 'short', prefill: 'full_name' },
      { id: 'fecha', q: 'Fecha en la que rellenas el formulario', kind: 'date', prefill: 'today' },
      { id: 'salud', q: '¿Han habido cambios en las condiciones de salud?', kind: 'long' },
      { id: 'habitos', q: '¿Han habido cambios en tus hábitos de vida?', kind: 'yesno' },
      { id: 'habitos_cuales', q: 'Si la respuesta es que sí, explícame cuáles.', kind: 'long', required: false },
      { id: 'objetivos', q: '¿Te sientes más cerca de cumplir tus objetivos? Cuéntame por qué.', kind: 'long' },
      { id: 'recuperacion', q: '¿Te estás recuperando bien de todos los grupos musculares?', kind: 'long' },
      { id: 'musculos', q: '¿Cuáles son los músculos que mejor y peor se están recuperando?', kind: 'long' },
      { id: 'cumplimiento', q: 'Grado de cumplimiento de la rutina de entrenamiento (1-10) ¿y de la dieta?', kind: 'short' },
      { id: 'pasos_apuntado', q: '¿Has apuntado el promedio de pasos semanal?', kind: 'yesno' },
      { id: 'estres', q: 'Valora del 1 al 10 tu nivel de estrés', kind: 'scale' },
      { id: 'motivacion', q: 'Valora del 1 al 10 tu nivel de motivación', kind: 'scale' },
      { id: 'satisfaccion', q: 'Valora del 1 al 10 tu satisfacción con el plan', kind: 'scale' },
      { id: 'sueno', q: '¿Cuántas horas duermes de media al día?', kind: 'short' },
      { id: 'fotos', q: '¿Has subido las fotos al Excel?', kind: 'yesno' },
      { id: 'perimetros', q: 'En caso de que toque, ¿has subido los perímetros al Excel?', kind: 'yesno' },
      { id: 'orgullo', q: 'Cuéntame algo de lo que te sientas muy orgulloso/a esta semana', kind: 'long' },
    ],
  },
  {
    type: 'cambio',
    title: 'Cambio a nueva planificación',
    color: '#a78bfa',
    intro: 'Antes de cada nueva planificación, en la fecha indicada.',
    questions: [
      { id: 'nombre', q: 'Nombre y apellidos', kind: 'short', prefill: 'full_name' },
      { id: 'fecha', q: 'Fecha', kind: 'date', prefill: 'today' },
      { id: 'dieta', q: '¿Hay algo que quieras cambiar, introducir o eliminar de la dieta?', kind: 'long' },
      { id: 'entreno', q: '¿Hay algo que quieras cambiar, introducir o eliminar del entreno?', kind: 'long' },
      { id: 'maquinaria', q: '¿Hay algún ejercicio que no puedas hacer por falta de maquinaria?', kind: 'long' },
      { id: 'suplementacion', q: '¿Qué suplementación estás tomando?', kind: 'long' },
      { id: 'molestias', q: '¿Cómo evolucionan las molestias? (si las hay)', kind: 'long' },
      { id: 'pasos', q: 'Media de pasos de esta última semana y de la anterior', kind: 'short' },
      { id: 'entrenos', q: '¿Qué entrenamiento has hecho hoy, cuál ayer y cuál mañana?', kind: 'long' },
      { id: 'marcas', q: 'Indícame marcas en algunos ejercicios (kg/repes)', kind: 'long' },
      { id: 'horario', q: 'Detállame tu horario actual, bien estructurado', kind: 'long' },
    ],
  },
]

export function templateByType(type: string): FormTemplate | undefined {
  return FORM_TEMPLATES.find((t) => t.type === type)
}

// ---- Envíos de formularios ----
export interface Answer {
  q: string
  a: string
}

export interface FormSubmission {
  id: string
  client_id: string
  form_type: string
  form_title: string
  answers: Answer[]
  reviewed: boolean
  created_at: string
}

export async function submitForm(
  clientId: string,
  template: FormTemplate,
  answers: Answer[],
): Promise<void> {
  const { error } = await supabase.from('form_submissions').insert({
    client_id: clientId,
    form_type: template.type,
    form_title: template.title,
    answers,
  })
  if (error) throw error
}

export async function listSubmissions(clientId: string): Promise<FormSubmission[]> {
  const { data, error } = await supabase
    .from('form_submissions')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as FormSubmission[]
}

export async function setReviewed(id: string, reviewed: boolean): Promise<void> {
  const { error } = await supabase.from('form_submissions').update({ reviewed }).eq('id', id)
  if (error) throw error
}
