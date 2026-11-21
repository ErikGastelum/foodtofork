import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { api } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useKitchen } from '../context/KitchenContext.jsx'
import { initialsOf } from '../utils/initials.js'
import '../styles/account.css'
import '../styles/accountUi.css'

// Account page. Functionality: Jonathan. Layout/styling: Maika.
// Profile card (initials, counts, sign out) + tiles into Recipes → My recipes + settings rows that
// open the name / password forms. Guests see "sign up / sign in" instead.
export default function Account() {
  const { user, isAdmin, logout } = useAuth()
  const { inventory, savedRecipes } = useKitchen()
  const navigate = useNavigate()
  const [shareCount, setShareCount] = useState(null) // null until the backend answers

  useEffect(() => {
    if (!user) return undefined
    const controller = new AbortController()
    api
      .myShares({ signal: controller.signal })
      .then((shares) => setShareCount(shares.length))
      .catch(() => setShareCount(null))
    return () => controller.abort()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return <GuestAccount />

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username
  const lastInitial = (user.last_name || '').trim()[0]
  const sharedAs = `${user.first_name || user.username}${lastInitial ? ` ${lastInitial.toUpperCase()}.` : ''}`

  return (
    <>
      <PageHeader title={`Hi, ${user.first_name || user.username}`} subtitle={isAdmin ? 'Admin account' : `Signed in as ${user.username}`} />
      <div className="page account-page account-page--profile">
        <aside className="card profile-card">
          <div className="profile-card__avatar" aria-hidden="true">
            {initialsOf(user)}
          </div>
          <h2 className="profile-card__name">{fullName}</h2>
          <p className="profile-card__user">@{user.username}</p>
          <div className="profile-card__stats">
            <div className="stat stat--mint">
              <strong>{inventory.length}</strong>
              <span>Pantry items</span>
            </div>
            <div className="stat stat--sun">
              <strong>{savedRecipes.length}</strong>
              <span>Saved</span>
            </div>
          </div>
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
        </aside>

        <div className="account-main">
          <h2 className="account-eyebrow">Your recipes</h2>
          <div className="tile-grid">
            <Link className="card tile" to="/recipes?tab=mine">
              <span className="tile__icon tile__icon--mint" aria-hidden="true">
                🔖
              </span>
              <span className="tile__text">
                <span className="tile__title">Saved recipes</span>
                <span className="tile__meta">{savedRecipes.length} saved</span>
              </span>
              <span className="tile__chev" aria-hidden="true">
                ›
              </span>
            </Link>
            <Link className="card tile" to="/recipes?tab=mine">
              <span className="tile__icon tile__icon--sun" aria-hidden="true">
                🤝
              </span>
              <span className="tile__text">
                <span className="tile__title">Shared with family</span>
                <span className="tile__meta">{shareCount === null ? 'Share a saved recipe' : `${shareCount} active ${shareCount === 1 ? 'link' : 'links'}`}</span>
              </span>
              <span className="tile__chev" aria-hidden="true">
                ›
              </span>
            </Link>
            {isAdmin && (
              <Link className="card tile" to="/admin">
                <span className="tile__icon tile__icon--mint" aria-hidden="true">
                  🛠️
                </span>
                <span className="tile__text">
                  <span className="tile__title">Manage accounts</span>
                  <span className="tile__meta">Admin only</span>
                </span>
                <span className="tile__chev" aria-hidden="true">
                  ›
                </span>
              </Link>
            )}
          </div>

          <h2 className="account-eyebrow">Settings</h2>
          <div className="card settings-list">
            <SettingsRow icon="👤" title="Your name" hint={`Family sees “${sharedAs}” on shared recipes`} action="Edit">
              <Profile />
            </SettingsRow>
            <SettingsRow icon="🔒" title="Password" hint="Change your sign-in password" action="Change">
              <ChangePassword />
            </SettingsRow>
          </div>

          <DeleteAccount />
        </div>
      </div>
    </>
  )
}

// One tappable settings line that opens its form underneath.
function SettingsRow({ icon, title, hint, action, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="settings-row">
      <button type="button" className="settings-row__head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="settings-row__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="settings-row__text">
          <span className="settings-row__title">{title}</span>
          <span className="settings-row__hint">{hint}</span>
        </span>
        <span className="settings-row__action">{open ? 'Close' : action}</span>
      </button>
      {open && <div className="settings-row__body">{children}</div>}
    </div>
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
    <form className="account-form" onSubmit={submit}>
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
    <form className="account-form" onSubmit={submit}>
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
