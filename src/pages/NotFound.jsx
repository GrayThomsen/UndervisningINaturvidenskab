import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <article className="prose">
      <h1>404 – siden blev ikke fundet</h1>
      <p>Siden findes ikke, eller den er blevet flyttet.</p>
      <p><Link to="/">Gå til forsiden</Link></p>
    </article>
  )
}
