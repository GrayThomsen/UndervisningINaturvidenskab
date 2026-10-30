import { supabase } from "./supabase";

const BUCKET = "documents";

export async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, kind, name")
    .order("name");
  if (error) throw error;
  return data;
}

const DOCUMENT_SELECT =
  "*, theme:theme_id(name), subject:subject_id(name), type:type_id(name)";

const check = ({ error }) => {
  if (error) throw error;
};

export async function addCategory(kind, name) {
  check(await supabase.from("categories").insert({ kind, name }));
}

export async function renameCategory(id, name) {
  check(await supabase.from("categories").update({ name }).eq("id", id));
}

export async function deleteCategory(id) {
  check(await supabase.from("categories").delete().eq("id", id));
}

export async function fetchAdminDocuments() {
  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Updates the document when id is given, otherwise inserts a new one.
export async function saveDocument(id, row) {
  check(
    id
      ? await supabase.from("documents").update(row).eq("id", id)
      : await supabase.from("documents").insert(row),
  );
}

export async function setPublished(id, published) {
  check(await supabase.from("documents").update({ published }).eq("id", id));
}

export async function deleteDocument(doc) {
  check(await supabase.from("documents").delete().eq("id", doc.id));
  await removeFile(doc.file_path);
}

// app_metadata can only be changed server-side, so users cannot grant themselves the role.
export const isAdmin = (session) => session?.user?.app_metadata?.role === 'admin'

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) =>
    callback(session),
  );
  return () => data.subscription.unsubscribe();
}

export async function signIn(email, password) {
  check(await supabase.auth.signInWithPassword({ email, password }));
}

export function signOut() {
  return supabase.auth.signOut();
}

const clean = (s) => s.replace(/[,()*%\\]/g, " ").trim();

export async function searchDocuments({
  q = "",
  themeId = "",
  subjectId = "",
  typeId = "",
  grade = "",
}) {
  let query = supabase
    .from("documents")
    .select(DOCUMENT_SELECT)
    .order("created_at", { ascending: false });

  // Every word must match title, description, subject or tag (partial or stemmed), in any order.
  for (const word of clean(q).split(/\s+/).filter(Boolean)) {
    query = query.or(
      `title.ilike.*${word}*,description.ilike.*${word}*,search.wfts(danish).${word}`,
    );
  }
  if (themeId) query = query.eq("theme_id", themeId);
  if (subjectId) query = query.eq("subject_id", subjectId);
  if (typeId) query = query.eq("type_id", typeId);

  const { data, error } = await query;
  if (error) throw error;
  return grade.trim() ? data.filter((d) => gradeMatches(d.grade, grade)) : data;
}

// Grades are free text ("8", "7-9", "Gymnasie"). A numeric search also matches ranges.
export function gradeMatches(docGrade, wanted) {
  const g = docGrade.toLowerCase();
  const w = wanted.trim().toLowerCase();
  if (g.includes(w)) return true;
  const n = Number(w);
  const range = g.match(/(\d+)\s*[-–]\s*(\d+)/);
  return (
    !Number.isNaN(n) && range && n >= Number(range[1]) && n <= Number(range[2])
  );
}

export function downloadUrl(doc) {
  return supabase.storage.from(BUCKET).getPublicUrl(doc.file_path, {
    download: doc.file_name,
  }).data.publicUrl;
}

export async function uploadFile(file) {
  const ext = file.name.includes(".")
    ? file.name.split(".").pop().toLowerCase()
    : "bin";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return {
    file_path: path,
    file_name: file.name,
    file_size: file.size,
    mime: file.type,
  };
}

export async function removeFile(path) {
  await supabase.storage.from(BUCKET).remove([path]);
}

export const formatSize = (bytes) =>
  !bytes
    ? ""
    : bytes < 1048576
      ? `${Math.round(bytes / 1024)} KB`
      : `${(bytes / 1048576).toFixed(1)} MB`;
