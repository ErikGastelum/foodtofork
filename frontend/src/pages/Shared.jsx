import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { api } from '../api/client.js'
import { KEYS, readJSON, writeJSON } from '../utils/storage.js'
import '../styles/account.css'

// A shared recipe (owner: Jonathan): /share/<id>.
// Anyone with the link sees the title ("Saturday Dinner"), notes, the recipe, and its grocery list,
// and can put their name on a missing ingredient. No account or guest choice needed.
// >>> MAIKA: skeleton only, restyle freely.
const REFRESH_MS = 20_000 // pick up other people's claims while the page is open

export default function Shared() {
  const { shareId } = useParams()
  const [share, setShare] = useState(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [name, setName] = useState(() => readJSON(KEYS.visitorName, '') || '')
  const nameRef = useRef(null)

  const load = useCallback(
    (signal) =>
      api
        .getShare(shareId, { signal })
        .then((s) => {
          setShare(s)
          setError('')
        })
        .catch((err) => err.name !== 'AbortError' && setError(err.message)),
    [shareId],
  )

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    const timer = setInterval(() => load(), REFRESH_MS)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => {
      controller.abort()
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  function saveName(value) {
    setName(value)
    writeJSON(KEYS.visitorName, value.trim() || null)
  }

  async function act(fn) {
    setActionError('')
    if (!name.trim()) {
      setActionError('Type your name first, so everyone knows who is bringing it.')
      nameRef.current?.focus()
      return
    }
    try {
      setShare(await fn())
    } catch (err) {
      setActionError(err.message)
      load() // someone else may have claimed it: show the latest
    }
  }

  if (error) {
    return (
      <div className="page account-page">
        <p className="state-msg">
          <strong>{error}</strong>
          Ask them to send you the newest link.
        </p>
      </div>
    )
  }
  if (!share) return <p className="state-msg">Loading…</p>

  const needed = share.items.filter((i) => !i.have)
  const have = share.items.filter((i) => i.have)
  const isMe = (claimer) => claimer && name.trim() && claimer.toLowerCase() === name.trim().toLowerCase()

  return (
    <>
      <PageHeader title={share.title} subtitle={`${share.owner_name} is making ${share.recipe.name}`} />
      <div className="page account-page">
        {share.notes && (
          <section className="card account-card">
            <h2>Notes from {share.owner_name}</h2>
            <p className="share-details__notes">{share.notes}</p>
          </section>
        )}

        <section className="card account-card">
          <div className="saved-recipe__head">
            {share.recipe.thumbnail && <img className="saved-recipe__thumb" src={share.recipe.thumbnail} alt="" />}
            <div className="saved-recipe__name">
              <strong>{share.recipe.name}</strong>
              <Link to={`/recipes/${share.recipe.id}`}>See the full recipe</Link>
            </div>
          </div>
        </section>

        <section className="card account-card">
          <h2>Can you bring something?</h2>
          <label className="field">
            <span>Your name</span>
            <input ref={nameRef} value={name} onChange={(e) => saveName(e.target.value)} placeholder="e.g. Aunt Maria" maxLength={40} autoComplete="name" />
          </label>

          {needed.length === 0 ? (
            <p className="account-note">{share.owner_name} already has everything. Just bring yourself!</p>
          ) : (
            <ul className="account-list claim-list">
              {needed.map((i) => (
                <li key={i.id}>
                  <span>
                    <strong>{i.name}</strong> {i.measure && <span className="account-note">{i.measure}</span>}
                  </span>
                  {!i.claimed_by ? (
                    <button type="button" className="btn btn--small btn--sun" onClick={() => act(() => api.claimItem(share.id, i.id, name))}>
                      I'll get it
                    </button>
                  ) : isMe(i.claimed_by) ? (
                    <span className="claim">
                      ✓ You're getting it{' '}
                      <button type="button" className="link-button" onClick={() => act(() => api.unclaimItem(share.id, i.id, name))}>
                        undo
                      </button>
                    </span>
                  ) : (
                    <span className="claim">✓ {i.claimed_by} is getting it</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {actionError && (
            <p className="account-error" role="alert">
              {actionError}
            </p>
          )}
        </section>

        {have.length > 0 && (
          <section className="card account-card">
            <h2>{share.owner_name} already has</h2>
            <p className="account-note">{have.map((i) => i.name).join(', ')}</p>
          </section>
        )}
      </div>
    </>
  )
}
