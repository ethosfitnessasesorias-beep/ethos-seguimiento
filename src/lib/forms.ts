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
  {
    type: 'nutricion',
    title: 'Registro nutricional',
    color: '#34d399',
    intro: 'Para conocer tus hábitos de alimentación (antes de la dieta o como control durante ella).',
    questions: [
      { id: 'nombre', q: 'Nombre y apellidos', kind: 'short', prefill: 'full_name' },
      { id: 'fecha', q: 'Fecha', kind: 'date', prefill: 'today' },
      { id: 'comidas_num', q: '¿Cuántas comidas haces al día?', kind: 'short' },
      { id: 'desayuno', q: 'Describe un DESAYUNO habitual (alimentos y cantidades aproximadas)', kind: 'long' },
      { id: 'comida', q: 'Describe una COMIDA habitual', kind: 'long' },
      { id: 'cena', q: 'Describe una CENA habitual', kind: 'long' },
      { id: 'snacks', q: '¿Qué sueles picar entre horas o de snack?', kind: 'long' },
      { id: 'agua', q: '¿Cuánta agua bebes al día (litros)?', kind: 'short' },
      { id: 'alcohol', q: '¿Consumes alcohol? ¿Con qué frecuencia?', kind: 'short' },
      { id: 'suplementos', q: '¿Tomas algún suplemento? ¿Cuáles?', kind: 'long' },
      { id: 'alergias', q: 'Alergias o intolerancias alimentarias', kind: 'long' },
      { id: 'no_gustan', q: 'Alimentos que NO te gustan o no comes', kind: 'long' },
      { id: 'fuera', q: '¿Comes fuera de casa a menudo? ¿Cuántas veces por semana?', kind: 'short' },
      { id: 'cocina', q: '¿Cuánto tiempo/ganas tienes de cocinar? ¿Sabes cocinar?', kind: 'long' },
      { id: 'hambre', q: 'Nivel de hambre habitual durante el día (1-10)', kind: 'scale' },
      { id: 'digestion', q: '¿Tienes buenas digestiones? ¿Algún problema digestivo?', kind: 'long' },
      { id: 'adherencia', q: 'Del 1 al 10, ¿cómo de bien sigues tu dieta actual (si tienes)?', kind: 'scale', required: false },
      { id: 'observaciones', q: '¿Algo más que deba saber sobre tu alimentación?', kind: 'long', required: false },
    ],
  },
  {
    type: 'encuesta',
    title: 'Encuesta de satisfacción',
    color: '#22d3ee',
    intro: 'Tu opinión nos ayuda a mejorar tu seguimiento. ¡Gracias por ser sincero/a!',
    questions: [
      { id: 'nps', q: 'Del 1 al 10, ¿qué probabilidad hay de que recomiendes ETHOS a un amigo?', kind: 'scale' },
      { id: 'satisfaccion', q: 'Del 1 al 10, ¿cómo valoras tu satisfacción general con el seguimiento?', kind: 'scale' },
      { id: 'entreno', q: '¿Cómo valoras tu plan de entrenamiento? (1-10)', kind: 'scale' },
      { id: 'nutricion', q: '¿Cómo valoras tu plan de nutrición? (1-10)', kind: 'scale' },
      { id: 'comunicacion', q: '¿Cómo valoras la comunicación y el trato con tu coach? (1-10)', kind: 'scale' },
      { id: 'resultados', q: '¿Estás contento/a con tus resultados hasta ahora?', kind: 'long' },
      { id: 'mejor', q: '¿Qué es lo que MÁS te está gustando?', kind: 'long' },
      { id: 'mejorar', q: '¿Qué podríamos MEJORAR?', kind: 'long' },
      { id: 'comentario', q: '¿Algo más que quieras decirnos?', kind: 'long', required: false },
    ],
  },
]

export function templateByType(type: string): FormTemplate | undefined {
  return FORM_TEMPLATES.find((t) => t.type === type)
}

// ---- Formularios personalizados (creados por el entrenador) ----
export interface CustomForm {
  id: string
  trainer_id: string
  title: string
  intro: string | null
  color: string | null
  questions: Question[]
  created_at: string
}

export async function listCustomForms(): Promise<CustomForm[]> {
  const { data, error } = await supabase.from('custom_forms').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as CustomForm[]
}

export async function saveCustomForm(f: { id?: string; title: string; intro: string; color: string; questions: Question[] }): Promise<void> {
  if (f.id) {
    const { error } = await supabase.from('custom_forms').update({ title: f.title, intro: f.intro, color: f.color, questions: f.questions }).eq('id', f.id)
    if (error) throw error
  } else {
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase.from('custom_forms').insert({ trainer_id: u.user?.id, title: f.title, intro: f.intro, color: f.color, questions: f.questions })
    if (error) throw error
  }
}

export async function deleteCustomForm(id: string): Promise<void> {
  const { error } = await supabase.from('custom_forms').delete().eq('id', id)
  if (error) throw error
}

export function customToTemplate(f: CustomForm): FormTemplate {
  return { type: `custom:${f.id}`, title: f.title, color: f.color || '#db1809', intro: f.intro || '', questions: f.questions }
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
