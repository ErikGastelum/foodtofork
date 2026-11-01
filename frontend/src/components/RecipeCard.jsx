import { Link } from 'react-router-dom'
import { tintFor } from '../utils/foodInfo.js'

// One recipe in the ranked list. `recipe` is a /match result from the API contract:
// { id, name, thumbnail, category, match, owned[], missing[] }
export default function RecipeCard({ recipe }) {
  const { id, name, thumbnail, emoji, match, missing } = recipe
  const shownMissing = missing.slice(0, 2).join(', ').toLowerCase()
  const extra = missing.length > 2 ? ` +${missing.length - 2}` : ''

  return (
    <Link to={`/recipes/${id}`} className="recipe-card">
      <div className={`recipe-card__media tint-${tintFor(recipe)}`}>
        {thumbnail ? <img src={thumbnail} alt="" loading="lazy" /> : <span aria-hidden="true">{emoji || '🍽️'}</span>}
        <span className="recipe-card__badge">{match}%</span>
      </div>
      <div className="recipe-card__body">
        <h3>{name}</h3>
        <div className="progress" role="img" aria-label={`${match}% of ingredients owned`}>
          <span style={{ width: `${match}%` }} />
        </div>
        <div className="recipe-card__chips">
          <span className="chip chip--static">{match}% match</span>
          {missing.length > 0 ? (
            <span className="chip chip--static chip--warn">
              Missing: {shownMissing}
              {extra}
            </span>
          ) : (
            <span className="chip chip--static">You have it all</span>
          )}
        </div>
      </div>
    </Link>
  )
}
