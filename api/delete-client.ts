// Elimina DEFINITIVAMENTE a un cliente (cuenta + todos sus datos). Solo puede
// llamarla el entrenador dueño de ese cliente. Usa la clave de administrador,
// que vive solo aquí en el servidor.
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
  if (me?.role !== 'trainer') return res.status(403).json({ error: 'Solo un entrenador puede eliminar clientes.' })

  const b = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) as { client_id?: string }
  const clientId = b?.client_id
  if (!clientId) return res.status(400).json({ error: 'Falta el cliente a eliminar.' })

  // El cliente debe pertenecer a ESTE entrenador y ser un cliente.
  const { data: target } = await supabase.from('profiles').select('role, trainer_id').eq('id', clientId).maybeSingle()
  if (!target || target.role !== 'client') return res.status(404).json({ error: 'Cliente no encontrado.' })
  if (target.trainer_id !== u.user.id) return res.status(403).json({ error: 'Ese cliente no es tuyo.' })

  // Borrar la cuenta elimina en cascada su perfil y todos sus datos.
  const { error } = await supabase.auth.admin.deleteUser(clientId)
  if (error) {
    // Si la cuenta de auth ya no existiera, al menos limpiamos el perfil.
    await supabase.from('profiles').delete().eq('id', clientId)
    return res.status(400).json({ error: error.message })
  }
  return res.status(200).json({ ok: true })
}
