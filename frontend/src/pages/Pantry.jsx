import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import SearchBar from '../components/SearchBar.jsx'
import RecipeGrid from '../components/RecipeGrid.jsx'
import EmptyKitchen from '../components/EmptyKitchen.jsx'
import { itemKey, useKitchen } from '../context/KitchenContext.jsx'
import { useMatches } from '../hooks/useMatches.js'
import { emojiFor, groupOf } from '../utils/foodInfo.js'
import '../styles/pantry.css'

const GROUPS = ['All', 'Produce', 'Dairy', 'Pantry']

// Home / inventory. Phone = the inventory list with a "Confirm & see recipes" button.
// Desktop ("My Kitchen") = inventory sidebar on the left, recipes you can make on the right.
//
// >>> JONATHAN: items arrive here from the barcode scanner (Scan.jsx) and ERIK's manual add
// (AddItem.jsx) through addItem() in KitchenContext. If you add fields to a Product
// (calories, macros...), the list below is the place to show them.
export default function Pantry() {
  const navigate = useNavigate()
  const { inventory, inventoryNames, removeItem } = useKitchen()
  const { recipes, loading, error } = useMatches(inventoryNames)

  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('All')
  const [sort, setSort] = useState('added') // 'added' | 'az'
  const [recipeQuery, setRecipeQuery] = useState('')

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = inventory.filter((i) => (group === 'All' || groupOf(i) === group) && i.name.toLowerCase().includes(q))
    return sort === 'az' ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : list
  }, [inventory, query, group, sort])

  const shownRecipes = useMemo(() => {
    const q = recipeQuery.trim().toLowerCase()
    return recipes
      .filter((r) => !q || r.name.toLowerCase().includes(q) || [...r.owned, ...r.missing].some((n) => n.toLowerCase().includes(q)))
      .slice(0, 6)
  }, [recipes, recipeQuery])

  return (
    <>
      <PageHeader
        title="What's in your kitchen?"
        subtitle={`${inventory.length} items · ${recipes.length} matching recipes`}
        desktop="hide"
      >
        <SearchBar value={query} onChange={setQuery} placeholder="Search your inventory…" />
      </PageHeader>

      <div className="pantry">
        <section className="pantry__side" aria-label="Your inventory">
          <h2 className="pantry__heading desktop-only">
            Your inventory <span className="count-pill">{inventory.length}</span>
          </h2>
          <div className="pantry__actions desktop-only">
            <Link className="btn btn--primary btn--block" to="/scan">
              ▣ Scan barcode
            </Link>
            <Link className="btn btn--outline btn--block" to="/add">
              + Add manually
            </Link>
          </div>
          <SearchBar className="pantry__desktop-search desktop-only" value={query} onChange={setQuery} placeholder="Search your inventory…" />

          {inventory.length === 0 ? (
            <EmptyKitchen />
          ) : (
            <>
              <div className="filters" role="group" aria-label="Filter by type">
                {GROUPS.map((g) => (
                  <button key={g} type="button" className={'chip' + (group === g ? ' chip--active' : '')} onClick={() => setGroup(g)}>
                    {g}
                  </button>
                ))}
                <button type="button" className="chip" onClick={() => setSort(sort === 'added' ? 'az' : 'added')}>
                  ⇅ {sort === 'az' ? 'A–Z' : 'Order added'}
                </button>
              </div>

              {items.length === 0 ? (
                <p className="state-msg">Nothing in your kitchen matches that.</p>
              ) : (
                <ul className="item-list">
                  {items.map((item) => (
                    <li key={itemKey(item)} className="item card">
                      <span className="item__icon" aria-hidden="true">
                        {item.image ? <img src={item.image} alt="" /> : emojiFor(item.name)}
                      </span>
                      <span className="item__text">
                        <span className="item__name">{item.name}</span>
                        <span className="item__meta">{[groupOf(item), item.brand].filter(Boolean).join(' · ')}</span>
                      </span>
                      <button type="button" className="item__remove" aria-label={`Remove ${item.name}`} onClick={() => removeItem(itemKey(item))}>
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <Link className="btn btn--outline btn--block pantry__add mobile-only" to="/add">
                + Add an item
              </Link>
              <button type="button" className="btn btn--sun btn--block pantry__confirm mobile-only" onClick={() => navigate('/recipes')}>
                Confirm &amp; see recipes →
              </button>
            </>
          )}
        </section>

        <section className="pantry__recipes desktop-only" aria-label="Recipes you can make now">
          <h2>Recipes you can make now</h2>
          <SearchBar value={recipeQuery} onChange={setRecipeQuery} placeholder="Search recipes or ingredients" />
          <div className="pantry__grid">
            <RecipeGrid
              recipes={inventory.length === 0 ? [] : shownRecipes}
              loading={inventory.length > 0 && loading}
              error={error}
              emptyText={inventory.length === 0 ? 'Add items on the left and matching recipes will show up here.' : 'No recipes match that search.'}
            />
          </div>
          {recipes.length > shownRecipes.length && (
            <Link className="btn btn--outline" to="/recipes">
              See all {recipes.length} recipes
            </Link>
          )}
        </section>
      </div>
    </>
  )
}
