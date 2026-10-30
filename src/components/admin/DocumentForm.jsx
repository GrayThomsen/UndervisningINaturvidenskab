import { useState } from 'react'
import { removeFile, saveDocument, uploadFile } from '../../lib/api'

export default function DocumentForm({ doc, categories, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: doc?.title ?? '',
    description: doc?.description ?? '',
    theme_id: doc?.theme_id ?? '',
    subject_id: doc?.subject_id ?? '',
    type_id: doc?.type_id ?? '',
    grade: doc?.grade ?? '',
    tags: doc?.tags?.join(', ') ?? '',
    published: doc?.published ?? false,
  })
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const field = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) })
  const selectedSubject = categories.find((category) => String(category.id) === form.subject_id)

  async function submit(e) {
    e.preventDefault()
    if (!doc && !file) return setError('Vælg en fil.')
    setBusy(true)
    setError('')
    let uploaded = null
    try {
      uploaded = file ? await uploadFile(file) : null
      await saveDocument(doc?.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        theme_id: form.theme_id || null,
        subject_id: form.subject_id || null,
        type_id: form.type_id || null,
        subjects: selectedSubject ? [selectedSubject.name] : [],
        grade: form.grade.trim(),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        published: form.published,
        ...uploaded,
      })
      if (uploaded && doc) await removeFile(doc.file_path)
      onSaved()
    } catch (err) {
      if (uploaded) await removeFile(uploaded.file_path)
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const themes = categories.filter((c) => c.kind === 'theme')
  const subjects = categories.filter((c) => c.kind === 'subject')
  const types = categories.filter((c) => c.kind === 'type')

  return (
    <form className="stack" onSubmit={submit}>
      <label>Titel <input required {...field('title')} /></label>
      <label>Beskrivelse <textarea rows="4" {...field('description')} /></label>
      <div className="grid">
        <label>Tema
          <select {...field('theme_id')}>
            <option value="">–</option>
            {themes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Fag
          <select {...field('subject_id')}>
            <option value="">–</option>
            {subjects.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Type
          <select {...field('type_id')}>
            <option value="">–</option>
            {types.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Klassetrin (fx 8, 7-9, Gymnasie)
          <input {...field('grade')} />
        </label>
      </div>
      <label>Emneord (kommasepareret) <input {...field('tags')} /></label>
      <label>{doc ? 'Erstat fil (valgfri, maks. 50 MB)' : 'Fil (maks. 50 MB)'}
        <input type="file" onChange={(e) => setFile(e.target.files[0] ?? null)} />
      </label>
      <label className="check">
        <input type="checkbox" checked={form.published}
          onChange={(e) => setForm({ ...form, published: e.target.checked })} />
        Publicér (synlig for alle)
      </label>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="btn" disabled={busy}>{busy ? 'Gemmer…' : 'Gem'}</button>
        {doc && <button type="button" onClick={onCancel}>Annuller</button>}
      </div>
    </form>
  )
}
