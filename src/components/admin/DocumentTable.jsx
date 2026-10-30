import { formatSize } from '../../lib/api'

export default function DocumentTable({ docs, onTogglePublished, onEdit, onRemove }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Titel</th><th>Tema</th><th>Fag</th><th>Type</th><th>Klassetrin</th><th>Status</th><th /></tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id}>
              <td>{d.title}<br /><small>{d.file_name} {formatSize(d.file_size)}</small></td>
              <td>{d.theme?.name}</td>
              <td>{d.subject?.name}</td>
              <td>{d.type?.name}</td>
              <td>{d.grade}</td>
              <td>{d.published ? 'Offentlig' : 'Kladde'}</td>
              <td>
                <div className="actions">
                  <button onClick={() => onTogglePublished(d)}>
                    {d.published ? 'Gør til kladde' : 'Publicér'}
                  </button>
                  <button onClick={() => onEdit(d)}>Rediger</button>
                  <button className="danger" onClick={() => onRemove(d)}>Slet</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
