// "My recipes" tab on the Recipes page (owner: Jonathan): saved recipes, each one shareable.
//
//   <MyRecipes query="cheese" />   (query = the Recipes page search box, optional)
//
// Signed in: each recipe can be shared with a title/notes and a claimable grocery list.
// Guest: saved recipes still work (kept in this browser); sharing needs an account.
// Layout/styling: Maika (friendly empty state). The card itself is SavedRecipeCard.jsx.
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useKitchen } from '../context/KitchenContext.jsx'
import Banner from './Banner.jsx'
import SavedRecipeCard from './SavedRecipeCard.jsx'
import '../styles/account.css'
import '../styles/accountUi.css'

export default function MyRecipes({ query = '' }) {
  const { user } = useAuth()
  const { savedRecipes, toggleSaved } = useKitchen()
  const [shares, setShares] = useState([])
  const [error, setError] = useState('')

  // Reload when the tab opens or the window comes back into focus, to pick up new claims.
  const load = useCallback(() => {
    if (!user) return
    api
      .myShares()
      .then((list) => {
        setShares(list)
        setError('')
      })
      .catch((err) => setError(err.message))
  }, [user])
  useEffect(() => {
    load()
    window.addEventListener('focus', load)
    return () => window.removeEventListener('focus', load)
  }, [load])

  const shareFor = (recipeId) => shares.find((s) => s.recipe.id === recipeId)
  const setShareFor = (recipeId, share) =>
    setShares((prev) => [...prev.filter((s) => s.recipe.id !== recipeId), ...(share ? [share] : [])])

  // Shared recipes that were un-saved (e.g. from the recipe page) still show, so they can be stopped.
  const orphans = shares.filter((s) => !savedRecipes.some((r) => r.id === s.recipe.id)).map((s) => s.recipe)

  const q = query.trim().toLowerCase()
  const matches = (r) => !q || r.name.toLowerCase().includes(q) || shareFor(r.id)?.title.toLowerCase().includes(q)
  const saved = savedRecipes.filter(matches)
  const shownOrphans = orphans.filter(matches)

  if (savedRecipes.length === 0 && orphans.length === 0) {
    return (
      <div className="empty-state card">
        <span className="empty-state__icon" aria-hidden="true">
          🔖
        </span>
        <h2>Save your first recipe</h2>
        <p className="account-note">Tap “☆ Save recipe” on any recipe and it shows up here, ready to share.</p>
        <Link className="btn btn--primary" to="/recipes">
          Browse recipes
        </Link>
      </div>
    )
  }

  return (
    <div className="my-recipes">
      {user ? (
        <p className="account-note">
          Share a recipe with family: give it a title like “Saturday Dinner” and they can say which missing ingredients they'll bring. They don't need an
          account.
        </p>
      ) : (
        <p className="account-note">
          <Link to="/signup">Create an account</Link> to share recipes with family and keep them on any device.
        </p>
      )}
      <Banner kind="error">{error}</Banner>
      {saved.length === 0 && shownOrphans.length === 0 ? (
        <p className="state-msg">No saved recipes match that search.</p>
      ) : (
        <ul className="saved-list">
          {saved.map((r) => (
            <SavedRecipeCard
              key={r.id}
              recipe={r}
              share={shareFor(r.id)}
              canShare={!!user}
              onShareChange={(share) => setShareFor(r.id, share)}
              onRemove={() => toggleSaved(r)}
            />
          ))}
          {shownOrphans.map((r) => (
            <SavedRecipeCard key={r.id} recipe={r} share={shareFor(r.id)} canShare notSaved onShareChange={(share) => setShareFor(r.id, share)} onRemove={() => {}} />
          ))}
        </ul>
      )}
    </div>
  )
}
