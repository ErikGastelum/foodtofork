import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { api } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import '../styles/account.css'

// Account page (owner: Jonathan): name, password, sign out. Saved recipes + sharing live in Recipes → My recipes.
// Guests see "sign up / sign in" instead.
// >>> MAIKA: skeleton only. Each <section> is one block you can move or restyle.
export default function Account() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return <GuestAccount />

  return (
    <>
      <PageHeader title={`Hi, ${user.first_name || user.username}`} subtitle={isAdmin ? 'Admin account' : `Signed in as ${user.username}`} />
      <div className="page account-page">
        <section className="card account-card">
          <h2>Saved &amp; shared recipes</h2>
          <p className="account-note">Your saved recipes, and the ones you've shared with family, are under Recipes → My recipes.</p>
          <Link className="btn btn--outline btn--block" to="/recipes?tab=mine">
            Go to My recipes
          </Link>
        </section>
        {isAdmin && (
          <section className="card account-card">
            <h2>Admin</h2>
            <Link className="btn btn--outline btn--block" to="/admin">
              Manage accounts
            </Link>
          </section>
        )}
        <Profile />
        <ChangePassword />
        <button
          type="button"
          className="btn btn--outline btn--block"
          onClick={async () => {
            await logout()
            navigate('/welcome')
          }}
        >
          Sign out
        </button>
        <DeleteAccount />
      </div>
    </>
  )
}

function GuestAccount() {
  return (
    <>
      <PageHeader title="Account" subtitle="You're using FoodToFork as a guest" />
      <div className="page account-page">
        <div className="card account-card">
          <p>Your kitchen is saved in this browser only. Make an account to keep it on any device and share recipes with family. Everything you've added comes with you.</p>
          <Link className="btn btn--primary btn--block" to="/signup">
            Create an account
          </Link>
          <Link className="btn btn--outline btn--block" to="/login">
            Sign in
          </Link>
        </div>
      </div>
    </>
  )
}

function Profile() {
  const { user, updateUser } = useAuth()
  const [first, setFirst] = useState(user.first_name)
  const [last, setLast] = useState(user.last_name)
  const [msg, setMsg] = useState(null) // { ok, text }

  async function submit(e) {
    e.preventDefault()
    try {
      updateUser(await api.updateProfile(first, last))
      setMsg({ ok: true, text: 'Name saved.' })
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    }
  }

  return (
    <form className="card account-card" onSubmit={submit}>
      <h2>Your name</h2>
      <div className="account-row account-row--fields">
        <label className="field">
          <span>First name</span>
          <input value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" required maxLength={40} />
        </label>
        <label className="field">
          <span>Last name</span>
          <input value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" required maxLength={40} />
        </label>
      </div>
      <p className="account-note">Family sees your first name and last initial on shared recipes.</p>
      <button type="submit" className="btn btn--outline btn--block">
        Save name
      </button>
      {msg && (
        <p className={msg.ok ? 'account-note' : 'account-error'} role="status">
          {msg.text}
        </p>
      )}
    </form>
  )
}

function ChangePassword() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [msg, setMsg] = useState(null) // { ok, text }

  async function submit(e) {
    e.preventDefault()
    try {
      await api.changePassword(current, next)
      setCurrent('')
      setNext('')
      setMsg({ ok: true, text: 'Password changed. Your other devices were signed out.' })
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    }
  }

  return (
    <form className="card account-card" onSubmit={submit}>
      <h2>Change password</h2>
      <label className="field">
        <span>Current password</span>
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
      </label>
      <label className="field">
        <span>New password (8+ characters)</span>
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required minLength={8} />
      </label>
      <button type="submit" className="btn btn--outline btn--block">
        Change password
      </button>
      {msg && (
        <p className={msg.ok ? 'account-note' : 'account-error'} role="status">
          {msg.text}
        </p>
      )}
    </form>
  )
}

function DeleteAccount() {
  const { endSession } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (!open) {
    return (
      <button type="button" className="account-danger-link" onClick={() => setOpen(true)}>
        Delete my account
      </button>
    )
  }

  async function submit(e) {
    e.preventDefault()
    try {
      await api.deleteAccount(password)
      endSession()
      navigate('/welcome')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form className="card account-card account-card--danger" onSubmit={submit}>
      <h2>Delete account</h2>
      <p>This deletes your account, pantry and saved recipes for good, and your share links stop working.</p>
      <label className="field">
        <span>Type your password to confirm</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </label>
      {error && <p className="account-error">{error}</p>}
      <div className="account-row">
        <button type="submit" className="btn btn--danger">
          Delete forever
        </button>
        <button type="button" className="btn btn--outline" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  )
}
