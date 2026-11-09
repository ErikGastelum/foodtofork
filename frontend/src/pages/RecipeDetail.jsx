import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getRecipe } from '../api/recipes.js'
import { useKitchen } from '../context/KitchenContext.jsx'
import { isOwned } from '../utils/match.js'
import { tintFor } from '../utils/foodInfo.js'
import AddToPlan from '../components/AddToPlan.jsx'
import '../styles/detail.css'

// Recipe detail: image, ingredients (owned vs still-to-buy) and step-by-step instructions.
//
// >>> JACOB: data comes from GET /recipes/{id} (src/api/recipes.js). TheMealDB instructions are one
// long string; we split it on line breaks into steps. If you clean the steps up in the
// backend (e.g. return them as a list), change `steps` below.
export default function RecipeDetail() {
  const { id } = useParams()
  const { inventoryNames, groceryList, addToGrocery } = useKitchen()
  const [recipe, setRecipe] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | notfound | error
  const stepsRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    getRecipe(id)
      .then((r) => {
        if (cancelled) return
        setRecipe(r)
        setStatus('ready')
      })
      .catch((e) => !cancelled && setStatus(e.status === 404 ? 'notfound' : 'error'))
    return () => {
      cancelled = true
    }
  }, [id])

  if (status === 'loading') return <p className="state-msg">Loading recipe…</p>
  if (status !== 'ready') {
    return (
      <div className="page">
        <p className="state-msg">
          <strong>{status === 'notfound' ? "We couldn't find that recipe." : 'Recipes are unavailable right now.'}</strong>
          {status === 'error' && 'Check your connection and try again in a moment.'}
        </p>
        <Link className="btn btn--primary" to="/recipes">
          Back to recipes
        </Link>
      </div>
    )
  }

  const ingredients = recipe.ingredients.map((ing) => ({ ...ing, owned: isOwned(ing.name, inventoryNames) }))
  const missing = ingredients.filter((i) => !i.owned).map((i) => i.name)
  const match = ingredients.length ? Math.round(((ingredients.length - missing.length) / ingredients.length) * 100) : 0
  const allListed = missing.every((n) => groceryList.some((g) => g.toLowerCase() === n.toLowerCase()))
  // TheMealDB text often has its own numbering ("1.", "step 1"), so strip it; the <ol> numbers the steps.
  const steps = (recipe.instructions || '')
    .split(/\r?\n+/)
    .map((s) => s.trim().replace(/^\d+[.)]\s*/, ''))
    .filter((s) => s && !/^step\s*\d+$/i.test(s))

  return (
    <article className="detail">
      <Link to="/recipes" className="detail__back">
        ← Back to recipes
      </Link>

      <div className="detail__layout">
        <div className={`detail__hero tint-${tintFor(recipe)}`}>
          {recipe.thumbnail ? <img src={recipe.thumbnail} alt="" /> : <span aria-hidden="true">{recipe.emoji || '🍽️'}</span>}
        </div>

        <div className="detail__body">
          <h1>{recipe.name}</h1>
          <p className="detail__meta">{[`${match}% match`, recipe.category, recipe.area].filter(Boolean).join(' · ')}</p>

          {/* >>> JACOB (stretch): macros (carbs / fats / sugar bars from the mockup) go here.
              TheMealDB has no nutrition data, so this needs another source. */}

          <h2>Ingredients</h2>
          <ul className="ingredients">
            {ingredients.map((ing) => (
              <li key={ing.name} className={ing.owned ? 'is-owned' : 'is-missing'}>
                <span className="ingredients__mark" aria-hidden="true">
                  {ing.owned ? '✓' : '+'}
                </span>
                <span className="ingredients__name">
                  {ing.name}
                  {!ing.owned && <em> — need to buy</em>}
                </span>
                <span className="ingredients__measure">{ing.measure}</span>
              </li>
            ))}
          </ul>

          {missing.length > 0 && (
            <button type="button" className="btn btn--outline btn--block" disabled={allListed} onClick={() => addToGrocery(missing)}>
              {allListed ? 'Missing items are on your grocery list ✓' : `Add ${missing.length} missing to grocery list`}
            </button>
          )}
          <AddToPlan recipe={recipe} />
          <button type="button" className="btn btn--sun btn--block" onClick={() => stepsRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            Start cooking
          </button>

          <h2 ref={stepsRef} className="detail__steps-title">
            Instructions
          </h2>
          <ol className="steps">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      </div>
    </article>
  )
}
