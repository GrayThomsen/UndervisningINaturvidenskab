import { useState } from 'react'
import { addCategory, deleteCategory, renameCategory } from '../../lib/api'

const KINDS = [['theme', 'Temaer'], ['subject', 'Fag'], ['type', 'Typer']]

export default function CategoryManager({ categories, onChange }) {
  const [error, setError] = useState('')

  async function run(action) {
    try {
      await action()
      setError('')
    } catch (err) {
      setError(err.message)
    }
    onChange()
  }

  return (
    <section>
      <h2>Kategorier</h2>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        {KINDS.map(([kind, label]) => (
          <div key={kind}>
            <h3>{label}</h3>
            <ul className="plain">
              {categories.filter((c) => c.kind === kind).map((c) => (
                <li key={c.id} className="row">
                  <span>{c.name}</span>
                  <span>
                    <button onClick={() => {
                      const name = prompt('Nyt navn', c.name)?.trim()
                      if (name) run(() => renameCategory(c.id, name))
                    }}>Omdøb</button>
                    <button className="danger" onClick={() => {
                      if (confirm(`Slet "${c.name}"? Materialer bliver uden kategori.`))
                        run(() => deleteCategory(c.id))
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
              run(() => addCategory(kind, name))
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
