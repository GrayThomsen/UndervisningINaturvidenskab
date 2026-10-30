import { supabase } from './supabase'

const BUCKET = 'documents'

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, kind, name')
    .order('name')
  if (error) throw error
  return data
}

const clean = (s) => s.replace(/[,()*%\\]/g, ' ').trim()

export async function searchDocuments({ q = '', themeId = '', typeId = '', grade = '' }) {
  let query = supabase
    .from('documents')
    .select('*, theme:theme_id(name), type:type_id(name)')
    .order('created_at', { ascending: false })

  const term = clean(q)
  if (term) {
    query = query.or(
      `title.ilike.*${term}*,description.ilike.*${term}*,search.wfts(danish).${term}`,
    )
  }
  if (themeId) query = query.eq('theme_id', themeId)
  if (typeId) query = query.eq('type_id', typeId)

  const { data, error } = await query
  if (error) throw error
  return grade.trim() ? data.filter((d) => gradeMatches(d.grade, grade)) : data
}

// Grades are free text ("8", "7-9", "Gymnasie"). A numeric search also matches ranges.
export function gradeMatches(docGrade, wanted) {
  const g = docGrade.toLowerCase()
  const w = wanted.trim().toLowerCase()
  if (g.includes(w)) return true
  const n = Number(w)
  const range = g.match(/(\d+)\s*[-–]\s*(\d+)/)
  return !Number.isNaN(n) && range && n >= Number(range[1]) && n <= Number(range[2])
}

export function downloadUrl(doc) {
  return supabase.storage.from(BUCKET).getPublicUrl(doc.file_path, {
    download: doc.file_name,
  }).data.publicUrl
}

export async function uploadFile(file) {
  const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'bin'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
  })
  if (error) throw error
  return { file_path: path, file_name: file.name, file_size: file.size, mime: file.type }
}

export async function removeFile(path) {
  await supabase.storage.from(BUCKET).remove([path])
}

export const formatSize = (bytes) =>
  !bytes ? '' : bytes < 1048576 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`
