import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { downloadUrl, fetchCategories, formatSize, searchDocuments } from '../lib/api'

export default function Home() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const themeId = params.get('theme') ?? ''
  const typeId = params.get('type') ?? ''
  const grade = params.get('grade') ?? ''

  const [categories, setCategories] = useState([])
  const [docs, setDocs] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCategories().then(setCategories).catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      searchDocuments({ q, themeId, typeId, grade })
        .then((d) => !cancelled && (setDocs(d), setError('')))
        .catch((e) => !cancelled && setError(e.message))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [q, themeId, typeId, grade])

  const set = (key) => (e) => {
    const next = new URLSearchParams(params)
    if (e.target.value) next.set(key, e.target.value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const themes = categories.filter((c) => c.kind === 'theme')
  const types = categories.filter((c) => c.kind === 'type')

  return (
    <>
      <h1>Find undervisningsmaterialer</h1>
      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <input type="search" placeholder="Søg i titel, beskrivelse og emneord…" aria-label="Søg"
          value={q} onChange={set('q')} />
        <select aria-label="Tema" value={themeId} onChange={set('theme')}>
          <option value="">Alle temaer</option>
          {themes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select aria-label="Type" value={typeId} onChange={set('type')}>
          <option value="">Alle typer</option>
          {types.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="text" placeholder="Klassetrin, fx 8" aria-label="Klassetrin"
          value={grade} onChange={set('grade')} />
      </form>

      {error && <p className="error">Der opstod en fejl: {error}</p>}
      {docs === null && !error && <p>Henter…</p>}
      {docs?.length === 0 && <p>Ingen materialer matcher din søgning.</p>}

      <ul className="cards">
        {docs?.map((d) => (
          <li key={d.id} className="card">
            <h2>{d.title}</h2>
            <p className="meta">
              {[d.theme?.name, d.type?.name, d.grade && `Klassetrin: ${d.grade}`]
                .filter(Boolean).join(' · ')}
            </p>
            {d.description && <p>{d.description}</p>}
            {d.tags.length > 0 && (
              <p className="tags">{d.tags.map((t) => <span key={t}>{t}</span>)}</p>
            )}
            <a className="btn" href={downloadUrl(d)}>
              Download {formatSize(d.file_size) && `(${formatSize(d.file_size)})`}
            </a>
          </li>
        ))}
      </ul>
    </>
  )
}
