import { supabase } from './supabase'

export const DOC_BUCKET = 'documents'

export type DocCategory = 'Entrenamiento' | 'Nutrición' | 'Guía'

export const DOC_CATEGORIES: { key: DocCategory; color: string; bg: string }[] = [
  { key: 'Entrenamiento', color: '#db1809', bg: 'rgba(219,24,9,0.12)' },
  { key: 'Nutrición', color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)' },
  { key: 'Guía', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
]

export function catStyle(cat: string) {
  return DOC_CATEGORIES.find((c) => c.key === cat) ?? { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' }
}

export interface DocumentRow {
  id: string
  client_id: string
  title: string
  category: string
  storage_path: string
  size_bytes: number | null
  created_at: string
}

export interface DocumentWithUrl extends DocumentRow {
  url: string | null
}

export function humanSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function listDocuments(clientId: string): Promise<DocumentWithUrl[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  const rows = (data ?? []) as DocumentRow[]
  if (rows.length === 0) return []
  const { data: signed } = await supabase.storage
    .from(DOC_BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), 3600)
  const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))
  return rows.map((r) => ({ ...r, url: byPath.get(r.storage_path) ?? null }))
}

export async function addDocument(clientId: string, file: File, title: string, category: DocCategory) {
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase()
  const path = `${clientId}/${crypto.randomUUID()}.${ext}`
  const { error: upErr } = await supabase.storage
    .from(DOC_BUCKET)
    .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (upErr) throw upErr
  const { error } = await supabase.from('documents').insert({
    client_id: clientId,
    title: title.trim() || file.name,
    category,
    storage_path: path,
    size_bytes: file.size,
  })
  if (error) throw error
}

export async function deleteDocument(doc: DocumentRow) {
  await supabase.storage.from(DOC_BUCKET).remove([doc.storage_path])
  const { error } = await supabase.from('documents').delete().eq('id', doc.id)
  if (error) throw error
}
