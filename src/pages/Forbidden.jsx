import { Link } from 'react-router-dom'
import { signOut } from '../lib/api'

export default function Forbidden() {
  return (
    <article className="prose">
      <h1>403 – ingen adgang</h1>
      <p>Din konto har ikke tilladelse til at se denne side.</p>
      <p className="row">
        <Link to="/">Gå til forsiden</Link>
        <button onClick={signOut}>Log ud</button>
      </p>
    </article>
  )
}
