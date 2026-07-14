import { createClient } from '@supabase/supabase-js'

// Conexión con la base de datos de ETHOS (Supabase).
//
// Nota de seguridad: la URL y la clave "anon" son públicas por diseño — están
// pensadas para ir en el código del navegador. La seguridad real la da el
// Row Level Security (RLS) configurado en la base de datos, que hace que cada
// usuario solo pueda ver/editar lo que le corresponde.
// La clave "service_role" (secreta) NUNCA debe estar aquí ni en el repositorio.

const SUPABASE_URL = 'https://pkxfeoensvvacgorndjn.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBreGZlb2Vuc3Z2YWNnb3JuZGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5OTQ0NjUsImV4cCI6MjA5OTU3MDQ2NX0.x-HxCsPdfvexsglQPRNyKnwgCT08GQnATcMdfF2LqEk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
