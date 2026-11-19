// One saved recipe in Recipes → My recipes, with its share (owner: Jonathan).
//
// Not shared yet -> "Share recipe & grocery list" opens a small form: title ("Saturday Dinner") + notes.
// Shared         -> the link, who's getting each missing ingredient, edit / update / stop sharing.
//
//   <SavedRecipeCard recipe={{ id, name, thumbnail }} share={Share | undefined} canShare={signed in?}
//                    onShareChange={(share | null) => ...} onRemove={() => ...} />
//
// >>> MAIKA: skeleton only, restyle freely.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'

export default function SavedRecipeCard({ recipe, share, canShare = true, notSaved = false, onShareChange, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(null) // null | 'remove' | 'stop'
  const [error, setError] = useState('')

  async function run(fn) {
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err.message)
    }
  }

  const stopSharing = () =>
    run(async () => {
      await api.deleteShare(share.id)
      onShareChange(null)
      setConfirm(null)
    })

  const remove = () =>
    run(async () => {
      if (share) await api.deleteShare(share.id)
      onShareChange(null)
      onRemove()
    })

  return (
    <li className="card saved-recipe">
      <div className="saved-recipe__head">
        {recipe.thumbnail && <img className="saved-recipe__thumb" src={recipe.thumbnail} alt="" />}
        <div className="saved-recipe__name">
          <Link to={`/recipes/${recipe.id}`}>{recipe.name}</Link>
          {notSaved && <span className="account-note">Not in your saved recipes anymore</span>}
        </div>
        {!notSaved && confirm !== 'remove' && (
          <button type="button" className="btn btn--small btn--outline" onClick={() => (share ? setConfirm('remove') : remove())}>
            Remove
          </button>
        )}
      </div>

      {confirm === 'remove' && (
        <div className="account-row">
          <span>This also stops sharing “{share.title}”.</span>
          <button type="button" className="btn btn--small btn--danger" onClick={remove}>
            Remove
          </button>
          <button type="button" className="btn btn--small btn--outline" onClick={() => setConfirm(null)}>
            Cancel
          </button>
        </div>
      )}

      {canShare && !share && !editing && !notSaved && (
        <button type="button" className="btn btn--primary btn--block" onClick={() => setEditing(true)}>
          Share recipe &amp; grocery list
        </button>
      )}

      {editing && (
        <ShareForm
          share={share}
          onCancel={() => setEditing(false)}
          onSave={(title, notes) =>
            run(async () => {
              onShareChange(share ? await api.editShare(share.id, { title, notes }) : await api.createShare(recipe.id, title, notes))
              setEditing(false)
            })
          }
        />
      )}

      {share && !editing && (
        <ShareDetails
          share={share}
          onClearClaim={(itemId) => run(async () => onShareChange(await api.clearClaim(share.id, itemId)))}
        />
      )}

      {share && !editing && confirm !== 'stop' && (
        <div className="account-row">
          <button type="button" className="btn btn--small btn--outline" onClick={() => setEditing(true)}>
            Edit title &amp; notes
          </button>
          <button type="button" className="btn btn--small btn--outline" onClick={() => run(async () => onShareChange(await api.refreshShare(share.id)))}>
            Update from my pantry
          </button>
          <button type="button" className="btn btn--small btn--outline" onClick={() => setConfirm('stop')}>
            Stop sharing
          </button>
        </div>
      )}

      {confirm === 'stop' && (
        <div className="account-row">
          <span>The link will stop working.</span>
          <button type="button" className="btn btn--small btn--danger" onClick={stopSharing}>
            Stop sharing
          </button>
          <button type="button" className="btn btn--small btn--outline" onClick={() => setConfirm(null)}>
            Cancel
          </button>
        </div>
      )}

      {error && <p className="account-error">{error}</p>}
    </li>
  )
}

function ShareForm({ share, onSave, onCancel }) {
  const [title, setTitle] = useState(share?.title ?? '')
  const [notes, setNotes] = useState(share?.notes ?? '')
  return (
    <form
      className="share-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSave(title, notes)
      }}
    >
      <label className="field">
        <span>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Saturday Dinner" maxLength={80} required />
      </label>
      <label className="field">
        <span>Notes (optional)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="6pm at our place. Bring a chair!" maxLength={1000} rows={3} />
      </label>
      <div className="account-row">
        <button type="submit" className="btn btn--small btn--primary">
          {share ? 'Save' : 'Share'}
        </button>
        <button type="button" className="btn btn--small btn--outline" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function ShareDetails({ share, onClearClaim }) {
  const [note, setNote] = useState('')
  const url = `${window.location.origin}/share/${share.id}`
  const needed = share.items.filter((i) => !i.have)
  const have = share.items.filter((i) => i.have)
  const claimed = needed.filter((i) => i.claimed_by).length

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setNote('Link copied.')
    } catch {
      setNote('Copy the link above by hand.')
    }
  }

  return (
    <div className="share-details">
      <p className="share-details__title">
        <strong>{share.title}</strong>
        <span className="chip chip--static">shared</span>
      </p>
      {share.notes && <p className="share-details__notes">{share.notes}</p>}

      <input className="share-url" readOnly value={url} onFocus={(e) => e.target.select()} aria-label={`Share link for ${share.title}`} />
      <div className="account-row">
        <button type="button" className="btn btn--small btn--primary" onClick={copy}>
          Copy link
        </button>
        {note && <span className="account-note">{note}</span>}
      </div>

      <h3>
        Still needed{' '}
        <span className="account-note">
          ({claimed} of {needed.length} covered)
        </span>
      </h3>
      {needed.length === 0 ? (
        <p className="account-note">You have everything for this one.</p>
      ) : (
        <ul className="account-list">
          {needed.map((i) => (
            <li key={i.id}>
              <span>
                {i.name} {i.measure && <span className="account-note">{i.measure}</span>}
              </span>
              {i.claimed_by ? (
                <span className="claim">
                  ✓ {i.claimed_by} is getting it{' '}
                  <button type="button" className="link-button" onClick={() => onClearClaim(i.id)} aria-label={`Clear ${i.claimed_by}'s claim on ${i.name}`}>
                    clear
                  </button>
                </span>
              ) : (
                <span className="account-note">Nobody yet</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {have.length > 0 && <p className="account-note">You have: {have.map((i) => i.name).join(', ')}</p>}
    </div>
  )
}
