import { supabase } from './supabase'

export const DOC_BUCKET = 'documents'

export type DocCategory = 'Entrenamiento' | 'Nutrición' | 'Guía' | 'Contrato'

export const DOC_CATEGORIES: { key: DocCategory; color: string; bg: string }[] = [
  { key: 'Entrenamiento', color: '#db1809', bg: 'rgba(219,24,9,0.12)' },
  { key: 'Nutrición', color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)' },
  { key: 'Guía', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  { key: 'Contrato', color: '#f5a623', bg: 'rgba(245,166,35,0.12)' },
]

// Categorías que el entrenador puede elegir al subir (el contrato es automático).
export const UPLOAD_CATEGORIES = DOC_CATEGORIES.filter((c) => c.key !== 'Contrato')

export function catStyle(cat: string) {
  return DOC_CATEGORIES.find((c) => c.key === cat) ?? { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' }
}

export interface DocFolder {
  id: string
  client_id: string
  name: string
  created_at: string
}

export interface DocumentRow {
  id: string
  client_id: string
  title: string
  category: string
  storage_path: string
  size_bytes: number | null
  folder_id: string | null
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

export async function addDocument(
  clientId: string,
  file: File,
  title: string,
  category: DocCategory,
  folderId?: string | null,
) {
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
    folder_id: folderId ?? null,
  })
  if (error) throw error
}

export async function deleteDocument(doc: DocumentRow) {
  await supabase.storage.from(DOC_BUCKET).remove([doc.storage_path])
  const { error } = await supabase.from('documents').delete().eq('id', doc.id)
  if (error) throw error
}

// ---- Carpetas ----
export async function listFolders(clientId: string): Promise<DocFolder[]> {
  const { data, error } = await supabase
    .from('document_folders')
    .select('*')
    .eq('client_id', clientId)
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []) as DocFolder[]
}

export async function createFolder(clientId: string, name: string): Promise<void> {
  const { error } = await supabase.from('document_folders').insert({ client_id: clientId, name: name.trim() })
  if (error) throw error
}

// Borra la carpeta; sus documentos quedan sin carpeta (no se eliminan).
export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase.from('document_folders').delete().eq('id', id)
  if (error) throw error
}

export async function moveDocument(docId: string, folderId: string | null): Promise<void> {
  const { error } = await supabase.from('documents').update({ folder_id: folderId }).eq('id', docId)
  if (error) throw error
}
