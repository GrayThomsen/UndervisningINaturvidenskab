import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchCategories, formatSize, removeFile, uploadFile } from '../lib/api'

export default function Admin() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <p>Henter…</p>
  if (!session) return <Login />

  return (
    <>
      <div className="row">
        <h1>Admin</h1>
        <button onClick={() => supabase.auth.signOut()}>Log ud</button>
      </div>
      <Dashboard />
    </>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setError(error ? 'Forkert e-mail eller adgangskode.' : '')
  }

  return (
    <form className="stack narrow" onSubmit={submit}>
      <h1>Log ind</h1>
      <label>E-mail
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>Adgangskode
        <input type="password" required value={password}
          onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn">Log ind</button>
    </form>
  )
}

function Dashboard() {
  const [categories, setCategories] = useState([])
  const [docs, setDocs] = useState([])
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchCategories(),
      supabase.from('documents').select('*, theme:theme_id(name), type:type_id(name)')
        .order('created_at', { ascending: false }),
    ]).then(([cats, res]) => {
      if (cancelled) return
      if (res.error) return setError(res.error.message)
      setCategories(cats)
      setDocs(res.data)
    }).catch((e) => !cancelled && setError(e.message))
    return () => { cancelled = true }
  }, [version])

  async function togglePublished(d) {
    await supabase.from('documents').update({ published: !d.published }).eq('id', d.id)
    reload()
  }

  async function remove(d) {
    if (!confirm(`Slet "${d.title}" permanent?`)) return
    const { error } = await supabase.from('documents').delete().eq('id', d.id)
    if (error) return setError(error.message)
    await removeFile(d.file_path)
    reload()
  }

  return (
    <>
      {error && <p className="error">{error}</p>}
      <section>
        <h2>{editing?.id ? 'Rediger materiale' : 'Upload nyt materiale'}</h2>
        <DocumentForm key={editing?.id ?? 'new'} doc={editing} categories={categories}
          onSaved={() => { setEditing(null); reload() }}
          onCancel={() => setEditing(null)} />
      </section>

      <section>
        <h2>Materialer ({docs.length})</h2>
        <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Titel</th><th>Tema</th><th>Type</th><th>Klassetrin</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td>{d.title}<br /><small>{d.file_name} {formatSize(d.file_size)}</small></td>
                <td>{d.theme?.name}</td>
                <td>{d.type?.name}</td>
                <td>{d.grade}</td>
                <td>{d.published ? 'Offentlig' : 'Kladde'}</td>
                <td className="actions">
                  <button onClick={() => togglePublished(d)}>
                    {d.published ? 'Gør til kladde' : 'Publicér'}
                  </button>
                  <button onClick={() => { setEditing(d); scrollTo(0, 0) }}>Rediger</button>
                  <button className="danger" onClick={() => remove(d)}>Slet</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      <CategoryManager categories={categories} onChange={reload} />
    </>
  )
}

function DocumentForm({ doc, categories, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: doc?.title ?? '',
    description: doc?.description ?? '',
    theme_id: doc?.theme_id ?? '',
    type_id: doc?.type_id ?? '',
    grade: doc?.grade ?? '',
    tags: doc?.tags?.join(', ') ?? '',
    published: doc?.published ?? false,
  })
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const field = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) })

  async function submit(e) {
    e.preventDefault()
    if (!doc && !file) return setError('Vælg en fil.')
    setBusy(true)
    setError('')
    let uploaded = null
    try {
      uploaded = file ? await uploadFile(file) : null
      const row = {
        title: form.title.trim(),
        description: form.description.trim(),
        theme_id: form.theme_id || null,
        type_id: form.type_id || null,
        grade: form.grade.trim(),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        published: form.published,
        ...uploaded,
      }
      const { error } = doc
        ? await supabase.from('documents').update(row).eq('id', doc.id)
        : await supabase.from('documents').insert(row)
      if (error) throw error
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

function CategoryManager({ categories, onChange }) {
  const [error, setError] = useState('')

  async function run(promise) {
    const { error } = await promise
    setError(error ? error.message : '')
    onChange()
  }

  return (
    <section>
      <h2>Kategorier</h2>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        {[['theme', 'Temaer'], ['type', 'Typer']].map(([kind, label]) => (
          <div key={kind}>
            <h3>{label}</h3>
            <ul className="plain">
              {categories.filter((c) => c.kind === kind).map((c) => (
                <li key={c.id} className="row">
                  <span>{c.name}</span>
                  <span>
                    <button onClick={() => {
                      const name = prompt('Nyt navn', c.name)?.trim()
                      if (name) run(supabase.from('categories').update({ name }).eq('id', c.id))
                    }}>Omdøb</button>
                    <button className="danger" onClick={() => {
                      if (confirm(`Slet "${c.name}"? Materialer bliver uden kategori.`))
                        run(supabase.from('categories').delete().eq('id', c.id))
                    }}>Slet</button>
                  </span>
                </li>
              ))}
            </ul>
            <form className="row" onSubmit={(e) => {
              e.preventDefault()
              const input = e.target.elements.name
              const name = input.value.trim()
              if (!name) return
              run(supabase.from('categories').insert({ kind, name }))
              input.value = ''
            }}>
              <input name="name" placeholder="Ny kategori" aria-label={`Ny ${label}`} />
              <button>Tilføj</button>
            </form>
          </div>
        ))}
      </div>
    </section>
  )
}
