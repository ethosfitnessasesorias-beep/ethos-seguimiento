// Recupera el acceso de un CLIENTE (o de un compañero ENTRENADOR): genera un
// enlace de acceso o fija una contraseña temporal. Solo puede llamarla un
// entrenador autenticado. Usa la clave de administrador, que vive solo aquí.
import { createClient } from '@supabase/supabase-js'

// Variables de entorno del servidor (Vercel), sin depender de @types/node.
declare const process: { env: Record<string, string | undefined> }

interface Req {
  headers: Record<string, string | undefined>
  body?: unknown
}
interface Res {
  status: (n: number) => Res
  json: (b: unknown) => void
}

export default async function handler(req: Req, res: Res) {
  const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { persistSession: false },
  })

  // El que llama debe ser un entrenador autenticado.
  const auth = req.headers['authorization']
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Sesión no encontrada.' })
  const { data: u } = await supabase.auth.getUser(auth.slice(7))
  if (!u.user) return res.status(401).json({ error: 'Sesión no válida.' })
  const { data: me } = await supabase.from('profiles').select('role').eq('id', u.user.id).maybeSingle()
  if (me?.role !== 'trainer') return res.status(403).json({ error: 'Solo un entrenador puede recuperar accesos.' })

  const b = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) as {
    user_id?: string
    mode?: 'link' | 'password'
    password?: string
    redirect_to?: string
  }
  const userId = b?.user_id
  const mode = b?.mode === 'password' ? 'password' : 'link'
  if (!userId) return res.status(400).json({ error: 'Falta la persona a recuperar.' })

  // Objetivo válido: un cliente DE ESTE entrenador, o un compañero entrenador.
  const { data: target } = await supabase.from('profiles').select('role, trainer_id, email').eq('id', userId).maybeSingle()
  if (!target) return res.status(404).json({ error: 'No se encontró esa cuenta.' })
  if (target.role === 'client' && target.trainer_id !== u.user.id) {
    return res.status(403).json({ error: 'Ese cliente no es tuyo.' })
  }
  if (!target.email) return res.status(400).json({ error: 'Esa cuenta no tiene email guardado.' })

  if (mode === 'password') {
    const password = b?.password
    if (!password || password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' })
    const { error } = await supabase.auth.admin.updateUserById(userId, { password })
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ ok: true, email: target.email })
  }

  // Enlace de un solo uso para entrar y poner una contraseña nueva.
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: target.email,
    options: b?.redirect_to ? { redirectTo: b.redirect_to } : undefined,
  })
  if (error) return res.status(400).json({ error: error.message })
  const link = (data as { properties?: { action_link?: string } })?.properties?.action_link
  if (!link) return res.status(400).json({ error: 'No se pudo generar el enlace.' })
  return res.status(200).json({ ok: true, link, email: target.email })
}
