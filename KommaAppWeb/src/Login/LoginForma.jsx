import { useState } from 'react'
import TabButton from '../TabComponents/TabButton'
import { loginUser } from '../services/authApi'
import './LoginForma.css'

function LoginForma({ onLoginSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!username.trim()) {
      setError('Unesite korisničko ime')
      return
    }
    if (!password.trim()) {
      setError('Unesite lozinku')
      return
    }

    setLoading(true)
    setError('')

    const result = await loginUser({ username: username.trim(), password })

    setLoading(false)

    if (!result.ok) {
      setError(result.error || 'Prijava nije uspjela')
      return
    }

    if (!result.user) {
      window.alert('Greška: Nedostaju podaci korisnika')
      return
    }

    onLoginSuccess?.(result.user)
  }

  return (
    <section className="login-container">
      <div className="login-card">
        <h1 className="login-title">Prijava</h1>
        <p className="login-subtitle">Prijavite se za ulaz u aplikaciju</p>

        <input
          className="login-input"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Korisničko ime"
          autoCapitalize="none"
        />

        <input
          className="login-input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Lozinka"
          type="password"
        />

        {!!error && <p className="login-error">{error}</p>}

        <div className="login-button-wrap">
          <TabButton label={loading ? 'Prijava...' : 'Prijavi se'} onClick={handleLogin} />
        </div>

        <p className="login-role-hint">Role: user / admin / superadmin</p>
      </div>
    </section>
  )
}

export default LoginForma
