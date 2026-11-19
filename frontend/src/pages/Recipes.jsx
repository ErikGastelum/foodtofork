import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import SearchBar from '../components/SearchBar.jsx'
import RecipeGrid from '../components/RecipeGrid.jsx'
import EmptyKitchen from '../components/EmptyKitchen.jsx'
import MyRecipes from '../components/MyRecipes.jsx'
import { useKitchen } from '../context/KitchenContext.jsx'
import { useMatches } from '../hooks/useMatches.js'
import '../styles/recipes.css'

// Recipe list: ranked by how much of each recipe the user already has.
// Phone = "Cook now" header + list. Desktop = yellow banner + grid.
//
// >>> JACOB: results come from POST /match (see src/api/recipes.js). The category chips are built
// from whatever categories the API returns. Calories / macro sorting is a stretch goal and
// needs nutrition data TheMealDB doesn't give us, so it isn't here yet.
//
// Tabs: Best match | Fewest missing | My recipes (Jonathan: saved recipes + sharing, components/MyRecipes.jsx).
// The tab is in the URL (/recipes?tab=mine) so other pages can link straight to it.
const TABS = [
  { id: 'best', label: 'Best match' },
  { id: 'fewest', label: 'Fewest missing' },
  { id: 'mine', label: 'My recipes' },
]

export default function Recipes() {
  const { inventory, inventoryNames, savedRecipes } = useKitchen()
  const { recipes, loading, error } = useMatches(inventoryNames)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [params, setParams] = useSearchParams()
  const sort = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'best'
  const setSort = (tab) => setParams(tab === 'best' ? {} : { tab }, { replace: true })

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

        <div className="filters" role="tablist" aria-label="Recipe lists">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={sort === t.id}
              className={'chip' + (sort === t.id ? ' chip--active' : '')}
              onClick={() => setSort(t.id)}
            >
              {t.label}
              {t.id === 'mine' && savedRecipes.length > 0 && ` (${savedRecipes.length})`}
            </button>
          ))}
        </div>

        {sort === 'mine' ? (
          <MyRecipes query={query} />
        ) : inventory.length === 0 ? (
          <EmptyKitchen />
        ) : (
          <>
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
