// Shared sign-in / sign-up form (owner: Jonathan). Used by pages/Login.jsx and pages/Signup.jsx.
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function AuthForm({ mode }) {
  const isSignup = mode === 'signup'
  const { login, signup } = useAuth()
  const navigate = useNavigate()
  const from = useLocation().state?.from || '/'

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (isSignup && password !== confirm) return setError("Passwords don't match.")
    setBusy(true)
    setError('')
    try {
      await (isSignup ? signup({ username, password, firstName, lastName }) : login(username, password))
      navigate(from === '/welcome' ? '/' : from, { replace: true })
    } catch (err) {
      setError(err.message) // backend messages are written for users
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card account-card" onSubmit={handleSubmit}>
      {isSignup && (
        <div className="account-row account-row--fields">
          <label className="field">
            <span>First name</span>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" required maxLength={40} />
          </label>
          <label className="field">
            <span>Last name</span>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" required maxLength={40} />
          </label>
        </div>
      )}
      <label className="field">
        <span>Username</span>
        <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required minLength={3} maxLength={30} />
      </label>
      <label className="field">
        <span>Password{isSignup && ' (8+ characters)'}</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          required
          minLength={isSignup ? 8 : 1}
        />
      </label>
      {isSignup && (
        <label className="field">
          <span>Confirm password</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
        </label>
      )}

      {error && (
        <p className="account-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
        {busy ? 'One moment…' : isSignup ? 'Create account' : 'Sign in'}
      </button>
      {isSignup && <p className="account-note">Anything already in your kitchen comes with you.</p>}

      <p className="account-note">
        {isSignup ? 'Already have an account? ' : 'New here? '}
        <Link to={isSignup ? '/login' : '/signup'} state={{ from }}>
          {isSignup ? 'Sign in' : 'Create an account'}
        </Link>
        {' · '}
        <Link to="/welcome" state={{ from }}>
          Back
        </Link>
      </p>
    </form>
  )
}
