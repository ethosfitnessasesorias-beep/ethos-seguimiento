// Mock data for the ETHOS GYM tracking prototype — ported from the design.
import { colors } from './theme'
import { chart, type SeriesPoint } from './lib/chart'

const adhColor = (a: number) =>
  a >= 80 ? colors.green : a >= 60 ? colors.amber : colors.accent

// ---- charts ----
const weightSeries: SeriesPoint[] = [
  { m: 'Abr', v: 88.4 },
  { m: '', v: 87.6 },
  { m: 'May', v: 86.5 },
  { m: '', v: 85.9 },
  { m: 'Jun', v: 85.1 },
  { m: '', v: 84.4 },
  { m: 'Jul', v: 83.6 },
]
export const wc = chart(weightSeries, 700, 240, 18, 30)

const spSeries: SeriesPoint[] = [
  { v: 88.4 },
  { v: 87.2 },
  { v: 86.1 },
  { v: 85 },
  { v: 84.2 },
  { v: 83.6 },
]
export const sp = chart(spSeries, 320, 80, 8, 10)

const waistSeries: SeriesPoint[] = [
  { v: 90 },
  { v: 88 },
  { v: 86 },
  { v: 84 },
  { v: 82 },
]
export const wa = chart(waistSeries, 700, 200, 14, 20)

// ---- perimeters ----
export interface Perimeter {
  name: string
  v: number
  prev: number
  delta: string
  dColor: string
  barW: string
}

const rawP = [
  { name: 'Cintura', v: 82, prev: 84 },
  { name: 'Cadera', v: 98, prev: 99 },
  { name: 'Pecho', v: 104, prev: 103 },
  { name: 'Brazo', v: 38, prev: 37.5 },
  { name: 'Pierna', v: 58, prev: 57.5 },
  { name: 'Cuello', v: 39, prev: 39.5 },
]
const maxAbs = Math.max(...rawP.map((p) => Math.abs(p.v - p.prev)))
export const perimeters: Perimeter[] = rawP.map((p) => {
  const d = +(p.v - p.prev).toFixed(1)
  const down = d <= 0
  return {
    ...p,
    delta: (d > 0 ? '+' : '') + d + ' cm',
    dColor: down ? colors.green : colors.amber,
    barW: ((Math.abs(d) / maxAbs) * 100).toFixed(0) + '%',
  }
})

// ---- photos ----
export interface ClientPhoto {
  id: string
  date: string
}
export const clientPhotos: ClientPhoto[] = [
  { id: 'cph1', date: '12 May' },
  { id: 'cph2', date: '12 Jun' },
  { id: 'cph3', date: '13 Jul' },
]

export interface TrainerPhoto {
  id: string
  date: string
  tag: string
}
export const trainerPhotos: TrainerPhoto[] = [
  { id: 'tph1', date: '12 May 2026', tag: 'Inicio' },
  { id: 'tph2', date: '01 Jun 2026', tag: 'Sem 3' },
  { id: 'tph3', date: '22 Jun 2026', tag: 'Sem 6' },
  { id: 'tph4', date: '13 Jul 2026', tag: 'Sem 9' },
]

// ---- documents ----
export interface DocItem {
  name: string
  type: string
  date: string
  size: string
  color: string
  bg: string
}
export const documents: DocItem[] = [
  { name: 'Plan de entrenamiento · Bloque 3', type: 'Entrenamiento', date: '08 Jul 2026', size: '2.4 MB', color: colors.accent, bg: 'rgba(219,24,9,0.12)' },
  { name: 'Plan de nutrición · Definición', type: 'Nutrición', date: '01 Jul 2026', size: '1.1 MB', color: colors.teal, bg: 'rgba(45,212,191,0.12)' },
  { name: 'Contextualización inicial', type: 'Guía', date: '12 May 2026', size: '640 KB', color: colors.purple, bg: 'rgba(167,139,250,0.12)' },
  { name: 'Guía de suplementación', type: 'Guía', date: '12 May 2026', size: '820 KB', color: colors.purple, bg: 'rgba(167,139,250,0.12)' },
  { name: 'Checklist de hábitos', type: 'Nutrición', date: '20 Jun 2026', size: '310 KB', color: colors.teal, bg: 'rgba(45,212,191,0.12)' },
]

// ---- calendar ----
export interface EvType {
  label: string
  color: string
  detail: string
  time: string
}
export const evTypes: Record<string, EvType> = {
  entreno: { label: 'Entrenamiento', color: colors.accent, detail: 'Rutina full body · 60 min', time: '18:30' },
  cardio: { label: 'Objetivo cardio', color: colors.amber, detail: '45 min zona 2 · 8.000 pasos', time: '07:30' },
  control: { label: 'Reporte semanal', color: colors.teal, detail: 'Rellenar antes de las 22:00', time: 'Hoy' },
  plan: { label: 'Cambio de planificación', color: colors.purple, detail: 'Revisión de bloque', time: 'Hoy' },
}

export const evByDay: Record<number, string[]> = {
  1: ['entreno', 'cardio'], 2: ['entreno'], 3: ['cardio'], 6: ['entreno', 'control'],
  8: ['entreno'], 9: ['cardio'], 10: ['entreno'], 13: ['entreno', 'cardio'], 15: ['control'],
  16: ['entreno'], 17: ['cardio'], 20: ['entreno', 'plan'], 22: ['entreno'], 23: ['cardio'],
  24: ['entreno'], 27: ['entreno', 'control'], 29: ['cardio'], 30: ['entreno'],
}

// July 2026: first weekday, Monday-based index; days in month; "today".
export const startDow = (new Date(2026, 6, 1).getDay() + 6) % 7
export const daysInMonth = 31
export const today = 13

export const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export const legend = [
  { label: 'Entrenamiento', color: colors.accent },
  { label: 'Cardio', color: colors.amber },
  { label: 'Reporte', color: colors.teal },
  { label: 'Cambio plan', color: colors.purple },
]

// ---- trainer clients ----
export interface Client {
  name: string
  initials: string
  plan: string
  adherence: number
  last: string
  next: string
  color: string
  adhW: string
}
const rawC = [
  { name: 'Marco Ríos', initials: 'MR', plan: 'Definición', adherence: 92, last: 'Hoy · Métricas', next: 'Reporte · Mañana' },
  { name: 'Lucía Prieto', initials: 'LP', plan: 'Recomposición', adherence: 78, last: 'Ayer · Foto progreso', next: 'Entreno · Hoy' },
  { name: 'Diego Navarro', initials: 'DN', plan: 'Volumen', adherence: 64, last: 'Hace 3 días', next: 'Cambio plan · 15 Jul' },
  { name: 'Sara Vidal', initials: 'SV', plan: 'Pérdida grasa', adherence: 41, last: 'Hace 9 días', next: 'Sin tareas' },
  { name: 'Iván Castro', initials: 'IC', plan: 'Fuerza', adherence: 88, last: 'Hoy · Reporte', next: 'Cardio · Hoy' },
  { name: 'Nerea Gil', initials: 'NG', plan: 'Definición', adherence: 73, last: 'Ayer', next: 'Reporte · 14 Jul' },
]
export const clients: Client[] = rawC.map((c) => ({
  ...c,
  color: adhColor(c.adherence),
  adhW: c.adherence + '%',
}))

// ---- trainer resumen ----
export interface Activity {
  name: string
  action: string
  tag: string
  color: string
  bg: string
  time: string
  ini: string
}
export const activity: Activity[] = [
  { name: 'Marco Ríos', action: 'completó Reporte semanal', tag: 'Formulario', color: colors.teal, bg: 'rgba(45,212,191,0.12)', time: '11:09', ini: 'MR' },
  { name: 'Nerea Gil', action: 'registró Métricas', tag: 'Evolución', color: colors.accent, bg: 'rgba(219,24,9,0.12)', time: '10:57', ini: 'NG' },
  { name: 'Lucía Prieto', action: 'subió Foto de progreso', tag: 'Evolución', color: colors.accent, bg: 'rgba(219,24,9,0.12)', time: '09:51', ini: 'LP' },
  { name: 'Iván Castro', action: 'completó Reporte semanal', tag: 'Formulario', color: colors.teal, bg: 'rgba(45,212,191,0.12)', time: '09:08', ini: 'IC' },
  { name: 'Diego Navarro', action: 'solicitó Cambio de planificación', tag: 'Formulario', color: colors.purple, bg: 'rgba(167,139,250,0.12)', time: '08:20', ini: 'DN' },
]

export interface Cumplimiento {
  name: string
  ini: string
  adh: number
  color: string
}
export const cumplimiento: Cumplimiento[] = [
  { name: 'Sara Vidal', ini: 'SV', adh: 41, color: colors.accent },
  { name: 'Diego Navarro', ini: 'DN', adh: 64, color: colors.amber },
  { name: 'Nerea Gil', ini: 'NG', adh: 73, color: colors.amber },
]

export interface Upcoming {
  name: string
  label: string
  when: string
  color: string
}
export const upcoming: Upcoming[] = [
  { name: 'Marco Ríos', label: 'Reporte semanal', when: 'Mañana', color: colors.teal },
  { name: 'Diego Navarro', label: 'Cambio de planificación', when: '15 Jul', color: colors.purple },
  { name: 'Iván Castro', label: 'Objetivo cardio', when: 'Hoy', color: colors.amber },
]

// ---- forms ----
export interface FormQA {
  q: string
  a: string
}
export interface FormItem {
  type: string
  date: string
  color: string
  status: 'Nuevo' | 'Revisado'
  q: FormQA[]
  stColor: string
  stBg: string
}
const stMap: Record<string, { c: string; b: string }> = {
  Nuevo: { c: colors.accent, b: 'rgba(219,24,9,0.14)' },
  Revisado: { c: 'rgba(245,245,245,0.55)', b: colors.surface2 },
}
// Real form templates (questions taken verbatim from the trainer's Google Forms).
const rawForms = [
  {
    type: 'Reporte semanal o bisemanal',
    date: '13 Jul 2026',
    color: colors.teal,
    status: 'Nuevo' as const,
    q: [
      { q: 'Nombre y apellidos', a: 'Marco Ríos' },
      { q: 'Fecha en la que rellenas el formulario', a: '13/07/2026' },
      { q: '¿Han habido cambios en las condiciones de salud?', a: 'No ha habido cambios importantes. El hombro derecho sigue mejorando poco a poco: ya no me molesta en los empujes horizontales y solo noto una pequeña incomodidad al final de las series por encima de la cabeza. La lumbar la he notado bien toda la semana haciendo el calentamiento de core que me pasaste.' },
      { q: '¿Han habido cambios en tus hábitos de vida?', a: 'No, esta semana he mantenido la misma rutina que las anteriores: mismo horario de trabajo, mismas comidas preparadas el domingo y los entrenos a la misma hora. Todo bastante estable.' },
      { q: 'Si la respuesta es que sí, explícame cuáles.', a: '—' },
      { q: '¿Te sientes más cerca de cumplir tus objetivos?', a: 'Sí, bastante. Me veo más definido en el espejo, sobre todo en la zona abdominal, y la ropa me queda más holgada de cintura. La báscula baja despacio pero constante, así que estoy motivado y con la sensación de que el plan está funcionando.' },
      { q: '¿Te estás recuperando bien de todos los grupos musculares?', a: 'En general sí. Llego a cada entreno con ganas y sin dolores raros. El único grupo que noto algo más cargado es el tren inferior, pero es agujetas normales, no molestia articular.' },
      { q: '¿Cuáles son los músculos que mejor y peor se están recuperando?', a: 'Los que mejor se recuperan son pecho y espalda: al día siguiente ya estoy fino. Los que peor, los cuádriceps y los glúteos tras el día de pierna; las agujetas me duran hasta 48 h y el segundo día me cuesta bajar escaleras.' },
      { q: '¿Cuál es el grado de cumplimiento de la rutina de entrenamiento, del 1 al 10? ¿Y de la dieta?', a: 'Entrenamiento 9/10: hice las 4 sesiones completas, solo tuve que acortar un poco la del jueves por tiempo. Dieta 8/10: entre semana clavado, pero el sábado tuve una comida fuera y me pasé un poco con los postres.' },
      { q: '¿Has apuntado el promedio de pasos semanal?', a: 'Sí, lo tengo apuntado: media de 9.400 pasos al día. Los días de oficina bajo a 7.000 y los fines de semana subo por encima de 12.000.' },
      { q: 'Valora del 1 al 10 tu nivel de estrés', a: '4' },
      { q: 'Valora del 1 al 10 tu nivel de motivación', a: '8' },
      { q: 'Valora del 1 al 10 tu nivel de satisfacción con tu plan', a: '9' },
      { q: '¿Cuántas horas duermes de media al día?', a: '7,2 h' },
      { q: '¿Has subido las fotos al Excel?', a: 'Sí' },
      { q: 'En caso de que toque, ¿has subido los perímetros corporales al Excel?', a: 'Sí' },
      { q: 'Cuéntame algo de lo cual te sientas muy orgulloso/a esta semana', a: 'Estoy orgulloso de haber cumplido los 10.000 pasos 6 de los 7 días y de no haberme saltado ni un entreno, incluso el día que salí tarde de trabajar y me daba pereza. Además batí mi marca en press banca, así que la semana ha sido redonda.' },
    ],
  },
  {
    type: 'Cambio a nueva planificación',
    date: '06 Jul 2026',
    color: colors.purple,
    status: 'Revisado' as const,
    q: [
      { q: 'Nombre y apellidos', a: 'Marco Ríos' },
      { q: 'Fecha', a: '06/07/2026' },
      { q: '¿Hay algo que quieras cambiar, introducir o eliminar de la dieta?', a: 'Me gustaría meter algo más de variedad en las cenas, que se me están haciendo repetitivas y acabo picando después. También reduciría un poco los lácteos porque noto algo de hinchazón por la intolerancia, y si se puede, cambiaría el arroz de la comida por patata o quinoa algunos días para no aburrirme.' },
      { q: '¿Hay algo que quieras cambiar, introducir o eliminar del entreno?', a: 'Cambiaría el press militar con barra por press con mancuernas o en máquina, porque es el ejercicio que más me carga el hombro derecho. Me gustaría introducir algo más de trabajo directo de espalda (algún remo extra) y, si es posible, añadir un día de énfasis en pierna, que siento que se me está quedando atrás respecto al tren superior.' },
      { q: '¿Hay algún ejercicio que no puedas hacer por falta de maquinaria?', a: 'En mi gimnasio no hay prensa de piernas ni máquina de femoral tumbado, así que esos dos los tengo que sustituir. Tampoco tengo poleas altas cómodas para jalones, hay una sola y suele estar ocupada a la hora que voy.' },
      { q: '¿Qué suplementación estás tomando?', a: 'Ahora mismo tomo creatina monohidrato 5 g al día (por la mañana), proteína de suero para completar proteína después de entrenar, y un multivitamínico. La cafeína la tomo solo en café, no uso preentreno.' },
      { q: '¿Cómo evolucionan las molestias? (si las hay)', a: 'El hombro derecho va claramente a mejor: al principio del bloque me molestaba en casi todos los empujes y ahora solo lo noto en trabajo por encima de la cabeza y con cargas altas. Hago los ejercicios de manguito rotador que me mandaste 2 veces por semana y creo que ahí está la diferencia.' },
      { q: 'Indícame media de pasos de esta última semana y de la anterior', a: 'Esta última semana he hecho una media de 9.400 pasos al día y la anterior 8.900. Estoy intentando aprovechar las llamadas de trabajo para andar y se nota.' },
      { q: '¿Qué entrenamiento has realizado hoy, cuál ayer y cuál realizarás mañana?', a: 'Hoy he hecho el día de empuje (pecho, hombro y tríceps), ayer toqué pierna completa y mañana me toca el día de tirón (espalda y bíceps). El domingo lo dejo de descanso activo con una caminata larga.' },
      { q: 'Indícame marcas en algunos ejercicios (si tenemos objetivos de kg/repes, ponlos también)', a: 'Press banca: 82,5 kg × 6 (el objetivo eran 6 repes, así que cumplido). Sentadilla: 110 kg × 5. Remo con barra: 70 kg × 8. Press inclinado con mancuernas: 30 kg × 10. En dominadas ya hago 3 series de 8 con peso corporal limpias.' },
      { q: 'Detállame tu horario actual (bien plasmado y estructurado)', a: '7:00 me levanto. 7:30 desayuno (café + avena y huevos). 9:00-14:00 trabajo. 14:30 comida principal. 18:30-19:45 entreno. 20:30 cena. 23:00 me acuesto. Los fines de semana desplazo todo una hora más tarde.' },
    ],
  },
  {
    type: 'Reporte semanal o bisemanal',
    date: '29 Jun 2026',
    color: colors.teal,
    status: 'Revisado' as const,
    q: [
      { q: 'Nombre y apellidos', a: 'Marco Ríos' },
      { q: 'Fecha en la que rellenas el formulario', a: '29/06/2026' },
      { q: '¿Han habido cambios en las condiciones de salud?', a: 'Ninguno reseñable. El hombro sigue igual que la semana pasada, con la misma molestia leve en press por encima de la cabeza, pero nada que me impida entrenar. Por lo demás me he encontrado con energía toda la semana.' },
      { q: '¿Han habido cambios en tus hábitos de vida?', a: 'Sí, he cambiado un par de cosas para intentar mejorar el descanso y la organización de las comidas.' },
      { q: 'Si la respuesta es que sí, explícame cuáles.', a: 'He empezado a acostarme antes, sobre las 23:00 en lugar de medianoche, y he dejado de mirar el móvil en la cama. También he vuelto a dejar la comida preparada los domingos, lo que me ha ayudado a no improvisar entre semana y a no saltarme ninguna comida del plan.' },
      { q: '¿Te sientes más cerca de cumplir tus objetivos?', a: 'Sí, lo voy notando semana a semana. El peso sigue bajando dentro de lo que esperábamos y mantengo fuerza en los básicos, que era mi mayor miedo al estar en déficit.' },
      { q: '¿Te estás recuperando bien de todos los grupos musculares?', a: 'Sí, esta semana me he recuperado bien de casi todo. Solo los hombros los he notado un poco más cansados, seguramente por acumular el trabajo de empuje con el día de espalda.' },
      { q: '¿Cuáles son los músculos que mejor y peor se están recuperando?', a: 'El que mejor se recupera es la espalda, la siento fuerte y sin cargas. El que peor, los hombros, sobre todo el deltoides posterior; llego al siguiente entreno de empuje notándolos algo fatigados.' },
      { q: '¿Cuál es el grado de cumplimiento de la rutina de entrenamiento, del 1 al 10? ¿Y de la dieta?', a: 'Entrenamiento 8/10: falté a una sesión por un imprevisto de trabajo, pero la recuperé el sábado. Dieta 9/10: la he cumplido casi al 100 %, solo un par de cafés con leche de más.' },
      { q: '¿Has apuntado el promedio de pasos semanal?', a: 'Sí, esta semana la media fue de 8.900 pasos diarios.' },
      { q: 'Valora del 1 al 10 tu nivel de estrés', a: '5' },
      { q: 'Valora del 1 al 10 tu nivel de motivación', a: '7' },
      { q: 'Valora del 1 al 10 tu nivel de satisfacción con tu plan', a: '8' },
      { q: '¿Cuántas horas duermes de media al día?', a: '7 h' },
      { q: '¿Has subido las fotos al Excel?', a: 'Sí' },
      { q: 'En caso de que toque, ¿has subido los perímetros corporales al Excel?', a: 'Esta semana no tocaba medir perímetros, los subiré en el próximo control quincenal.' },
      { q: 'Cuéntame algo de lo cual te sientas muy orgulloso/a esta semana', a: 'Me siento orgulloso de haber recuperado el entreno que perdí en vez de saltármelo, y de haber conseguido mejorar mi marca en press banca a pesar de estar arrastrando la molestia del hombro. Ir cumpliendo aunque las cosas no salgan perfectas me está dando mucha confianza.' },
    ],
  },
]
export const forms: FormItem[] = rawForms.map((f) => ({
  ...f,
  stColor: stMap[f.status].c,
  stBg: stMap[f.status].b,
}))
