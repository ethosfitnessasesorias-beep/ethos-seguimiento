// Crea una cuenta de ENTRENADOR. Solo puede llamarla un entrenador con sesión
// válida. Usa la clave de administrador (service_role), que vive solo aquí en
// el servidor, nunca en el navegador.
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
  if (me?.role !== 'trainer') return res.status(403).json({ error: 'Solo un entrenador puede crear otros entrenadores.' })

  const b = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) as {
    email?: string
    password?: string
    full_name?: string
    phone?: string
  }
  const email = b?.email?.trim().toLowerCase()
  const password = b?.password
  const full_name = b?.full_name?.trim() || null
  const phone = b?.phone?.trim() || null
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Email y contraseña (mínimo 6 caracteres) obligatorios.' })
  }
  if (!phone) {
    return res.status(400).json({ error: 'El teléfono/WhatsApp es obligatorio.' })
  }

  // Crear el usuario (ya confirmado, sin email de verificación).
  const { data: created, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !created.user) return res.status(400).json({ error: error?.message || 'No se pudo crear la cuenta.' })

  // Ficha de perfil como entrenador.
  const { error: pErr } = await supabase.from('profiles').insert({ id: created.user.id, role: 'trainer', full_name, email, phone })
  if (pErr) return res.status(400).json({ error: pErr.message })

  return res.status(200).json({ ok: true, email })
}
