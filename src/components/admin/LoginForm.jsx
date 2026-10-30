import { useState } from 'react'
import { signIn } from '../../lib/api'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    try {
      await signIn(email, password)
      setError('')
    } catch {
      setError('Forkert e-mail eller adgangskode.')
    }
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
