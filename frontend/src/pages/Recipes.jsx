import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import SearchBar from '../components/SearchBar.jsx'
import RecipeGrid from '../components/RecipeGrid.jsx'
import EmptyKitchen from '../components/EmptyKitchen.jsx'
import { useKitchen } from '../context/KitchenContext.jsx'
import { useMatches } from '../hooks/useMatches.js'
import '../styles/recipes.css'

// Recipe list: ranked by how much of each recipe the user already has.
// Phone = "Cook now" header + list. Desktop = yellow banner + grid.
//
// >>> JACOB: results come from POST /match (see src/api/recipes.js). The category chips are built
// from whatever categories the API returns. Calories / macro sorting is a stretch goal and
// needs nutrition data TheMealDB doesn't give us, so it isn't here yet.
export default function Recipes() {
  const { inventory, inventoryNames } = useKitchen()
  const { recipes, loading, error } = useMatches(inventoryNames)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [sort, setSort] = useState('best')

  const categories = useMemo(() => ['All', ...new Set(recipes.map((r) => r.category).filter(Boolean))], [recipes])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = recipes.filter(
      (r) =>
        (category === 'All' || r.category === category) &&
        (!q || r.name.toLowerCase().includes(q) || [...r.owned, ...r.missing].some((i) => i.toLowerCase().includes(q))),
    )
    if (sort === 'fewest') return [...list].sort((a, b) => a.missing.length - b.missing.length || b.match - a.match)
    return list // API order = best match first
  }, [recipes, query, category, sort])

  return (
    <>
      <PageHeader title="Cook now" subtitle="Ranked by what you already have" desktop="hide">
        <SearchBar value={query} onChange={setQuery} placeholder="Search recipes…" />
      </PageHeader>

      <div className="page">
        <div className="hero-banner desktop-only">
          <h1>Cook what you already have</h1>
          <p>Featured recipes picked from your kitchen.</p>
        </div>

        {inventory.length === 0 ? (
          <EmptyKitchen />
        ) : (
          <>
            <div className="filters" role="group" aria-label="Sort recipes">
              <button type="button" className={'chip' + (sort === 'best' ? ' chip--active' : '')} onClick={() => setSort('best')}>
                Best match
              </button>
              <button type="button" className={'chip' + (sort === 'fewest' ? ' chip--active' : '')} onClick={() => setSort('fewest')}>
                Fewest missing
              </button>
            </div>
            {categories.length > 2 && (
              <div className="filters filters--scroll" role="group" aria-label="Filter by category">
                {categories.map((c) => (
                  <button key={c} type="button" className={'chip' + (category === c ? ' chip--active' : '')} onClick={() => setCategory(c)}>
                    {c}
                  </button>
                ))}
              </div>
            )}
            <RecipeGrid recipes={visible} loading={loading} error={error} emptyText="No recipes match that search." />
          </>
        )}
      </div>
    </>
  )
}
