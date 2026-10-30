import { useCallback, useEffect, useState } from 'react'
import {
  deleteDocument, fetchAdminDocuments, fetchCategories, getSession, isAdmin, onAuthChange,
  setPublished, signOut,
} from '../lib/api'
import CategoryManager from '../components/admin/CategoryManager'
import DocumentForm from '../components/admin/DocumentForm'
import DocumentTable from '../components/admin/DocumentTable'
import LoginForm from '../components/admin/LoginForm'
import Forbidden from './Forbidden'

export default function Admin() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    getSession().then(setSession)
    return onAuthChange(setSession)
  }, [])

  if (session === undefined) return <p>Henter…</p>
  if (!session) return <LoginForm />
  if (!isAdmin(session)) return <Forbidden />

  return (
    <>
      <div className="row">
        <h1>Admin</h1>
        <button onClick={signOut}>Log ud</button>
      </div>
      <Dashboard />
    </>
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
    Promise.all([fetchCategories(), fetchAdminDocuments()])
      .then(([cats, documents]) => {
        if (cancelled) return
        setCategories(cats)
        setDocs(documents)
      })
      .catch((e) => !cancelled && setError(e.message))
    return () => { cancelled = true }
  }, [version])

  async function run(action) {
    try {
      await action()
      setError('')
    } catch (err) {
      setError(err.message)
    }
    reload()
  }

  const togglePublished = (d) => run(() => setPublished(d.id, !d.published))
  const remove = (d) => {
    if (confirm(`Slet "${d.title}" permanent?`)) run(() => deleteDocument(d))
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
        <DocumentTable docs={docs} onTogglePublished={togglePublished}
          onEdit={(d) => { setEditing(d); scrollTo(0, 0) }} onRemove={remove} />
      </section>

      <CategoryManager categories={categories} onChange={reload} />
    </>
  )
}
