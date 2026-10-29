import PageHeader from '../components/PageHeader.jsx'
import EmptyKitchen from '../components/EmptyKitchen.jsx'
import { useKitchen } from '../context/KitchenContext.jsx'
import { useMatches } from '../hooks/useMatches.js'
import { emojiFor, groupOf } from '../utils/foodInfo.js'
import '../styles/missing.css'

// "Missing supplies" (the cart tab): recipes that are only 1-2 ingredients away, plus the
// user's grocery list. The grocery list is saved in localStorage via KitchenContext.
//
// >>> JACOB: `missing` comes straight from POST /match. If you later want to hide pantry
// staples (salt, oil...) from this screen, filter them in the backend response.
export default function Missing() {
  const { inventory, inventoryNames, groceryList, addToGrocery, removeFromGrocery } = useKitchen()
  const { recipes, loading, error } = useMatches(inventoryNames)

  const near = recipes.filter((r) => r.missing.length >= 1 && r.missing.length <= 2)
  const allNames = [...new Set(near.flatMap((r) => r.missing))]
  const onList = (name) => groceryList.some((g) => g.toLowerCase() === name.toLowerCase())
  const everythingListed = allNames.every(onList)

  let content
  if (inventory.length === 0) content = <EmptyKitchen />
  else if (loading) content = <p className="state-msg">Checking your recipes…</p>
  else if (error) {
    content = (
      <p className="state-msg">
        <strong>Recipes are unavailable right now.</strong>
        Check your connection and try again in a moment.
      </p>
    )
  } else if (near.length === 0) {
    content = (
      <p className="state-msg">
        <strong>No recipe is 1–2 items away yet.</strong>
        Add more to your kitchen and the closest recipes will show up here.
      </p>
    )
  } else {
    content = (
      <>
        {near.map((r) => (
          <section key={r.id} className="missing-group">
            <h2>
              {r.name} · {r.missing.length} missing
            </h2>
            <ul>
              {r.missing.map((name) => (
                <li key={name} className="card missing-row">
                  <span className="item__icon" aria-hidden="true">
                    {emojiFor(name)}
                  </span>
                  <span className="item__text">
                    <span className="item__name">{name}</span>
                    <span className="item__meta">{groupOf(name)}</span>
                  </span>
                  <button type="button" className="btn btn--small btn--outline" disabled={onList(name)} onClick={() => addToGrocery(name)}>
                    {onList(name) ? '✓ Listed' : '+ List'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <button type="button" className="btn btn--primary btn--block" disabled={everythingListed} onClick={() => addToGrocery(allNames)}>
          {everythingListed ? 'All added to grocery list ✓' : 'Add all to grocery list'}
        </button>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Missing supplies" subtitle="Only 1–2 items away from a recipe" />
      <div className="page missing-page">
        {content}

        {groceryList.length > 0 && (
          <section className="missing-group grocery">
            <h2>Your grocery list · {groceryList.length}</h2>
            <ul>
              {groceryList.map((name) => (
                <li key={name} className="card missing-row">
                  <span className="item__icon" aria-hidden="true">
                    {emojiFor(name)}
                  </span>
                  <span className="item__text">
                    <span className="item__name">{name}</span>
                  </span>
                  <button type="button" className="item__remove" aria-label={`Remove ${name} from grocery list`} onClick={() => removeFromGrocery(name)}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  )
}
