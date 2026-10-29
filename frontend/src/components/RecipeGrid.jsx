import RecipeCard from './RecipeCard.jsx'

// A list of RecipeCards plus the loading / error / empty messages, so every page
// that shows recipes handles those states the same way.
export default function RecipeGrid({ recipes, loading, error, emptyText = 'No recipes match yet. Try adding more items.' }) {
  if (loading) return <p className="state-msg">Finding recipes…</p>
  if (error) {
    return (
      <p className="state-msg">
        <strong>Recipes are unavailable right now.</strong>
        Check your connection and try again in a moment.
      </p>
    )
  }
  if (recipes.length === 0) return <p className="state-msg">{emptyText}</p>
  return (
    <div className="recipe-grid">
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} />
      ))}
    </div>
  )
}
