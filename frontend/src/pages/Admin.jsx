import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { api } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import '../styles/account.css'

// Admin dashboard (owner: Jonathan): list accounts, set a new password, delete an account.
// Only admins reach this page (RequireAdmin in App.jsx), and the backend checks again.
// >>> MAIKA: skeleton only. A table on desktop / cards on phone would be nice.
export default function Admin() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setStatus('loading')
    api
      .adminListUsers()
      .then((rows) => {
        setUsers(rows)
        setStatus('ready')
      })
      .catch((err) => {
        setError(err.message)
        setStatus('error')
      })
  }, [])

  useEffect(load, [load])

  return (
    <>
      <PageHeader title="Manage accounts" subtitle={status === 'ready' ? `${users.length} accounts` : 'Admin'} />
      <div className="page account-page account-page--wide">
        {status === 'loading' && <p className="state-msg">Loading accounts…</p>}
        {status === 'error' && <p className="account-error">{error}</p>}
        {status === 'ready' && (
          <ul className="admin-list">
            {users.map((u) => (
              <AdminRow key={u.id} row={u} isMe={u.id === me.id} onChanged={load} />
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function AdminRow({ row, isMe, onChanged }) {
  const [mode, setMode] = useState(null) // null | 'password' | 'delete'
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(null) // { ok, text }

  async function resetPassword(e) {
    e.preventDefault()
    try {
      await api.adminResetPassword(row.id, password)
      setPassword('')
      setMode(null)
      setMsg({ ok: true, text: `New password set. ${row.username} was signed out everywhere.` })
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    }
  }

  async function remove() {
    try {
      await api.adminDeleteUser(row.id)
      onChanged()
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    }
  }

  return (
    <li className="card admin-row">
      <div className="admin-row__info">
        <strong>{[row.first_name, row.last_name].filter(Boolean).join(' ') || row.username}</strong>
        <span className="admin-row__user">@{row.username}</span>
        {row.role === 'admin' && <span className="chip chip--static">admin</span>}
        {isMe && <span className="chip chip--static">you</span>}
        <span className="account-note">
          {row.pantry_items} pantry items · {row.saved_recipes} saved recipes · {row.shares} shared · joined {new Date(row.created_at).toLocaleDateString()}
        </span>
      </div>

      {mode === null && (
        <div className="account-row">
          <button type="button" className="btn btn--small btn--outline" onClick={() => setMode('password')}>
            Set new password
          </button>
          {!isMe && (
            <button type="button" className="btn btn--small btn--danger" onClick={() => setMode('delete')}>
              Delete
            </button>
          )}
        </div>
      )}

      {mode === 'password' && (
        <form className="account-row" onSubmit={resetPassword}>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (8+ characters)"
            minLength={8}
            required
            aria-label={`New password for ${row.username}`}
          />
          <button type="submit" className="btn btn--small btn--primary">
            Save
          </button>
          <button type="button" className="btn btn--small btn--outline" onClick={() => setMode(null)}>
            Cancel
          </button>
        </form>
      )}

      {mode === 'delete' && (
        <div className="account-row">
          <span>Delete {row.username} and their kitchen for good?</span>
          <button type="button" className="btn btn--small btn--danger" onClick={remove}>
            Yes, delete
          </button>
          <button type="button" className="btn btn--small btn--outline" onClick={() => setMode(null)}>
            Cancel
          </button>
        </div>
      )}

      {msg && <p className={msg.ok ? 'account-note' : 'account-error'}>{msg.text}</p>}
    </li>
  )
}
