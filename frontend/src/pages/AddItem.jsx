import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { itemKey, useKitchen } from '../context/KitchenContext.jsx'
import { useProductSearch } from '../hooks/useProductSearch.js'
import { emojiFor } from '../utils/foodInfo.js'
import '../styles/scan.css'

// Manual add with autocomplete (also the fallback when a barcode isn't found).
//
// The search itself is Jonathan's useProductSearch hook (hooks/useProductSearch.js): it waits
// 300 ms after typing stops, needs 2+ characters and cancels stale requests, as
// API_CONTRACT.md asks. This page is the UI around it.
//
// >>> ERIK: manual add is your feature. This page is the finished UI shell. Build on it
// as you need (for example a "can't find it? add by name" option) and tell Maika
// so we don't edit this file at the same time.
export default function AddItem() {
  const { inventory, addItem } = useKitchen()
  const [query, setQuery] = useState('')
  const { results, loading, error } = useProductSearch(query)

  const typedEnough = query.trim().length >= 2
  const isAdded = (p) => inventory.some((i) => itemKey(i) === itemKey(p))

  return (
    <>
      <PageHeader title="Add an item" subtitle="Search Open Food Facts" />
      <div className="page scan-page">
        <label className="search search--outlined">
          <span aria-hidden="true">🔍</span>
          <span className="visually-hidden">Search for a food</span>
          <input type="search" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try “oat” or “eggs”" />
        </label>

        {!typedEnough && <p className="state-msg">Type at least 2 letters to search.</p>}
        {typedEnough && loading && results.length === 0 && <p className="state-msg">Searching…</p>}
        {typedEnough && error && (
          <p className="state-msg" role="alert">
            <strong>Search is unavailable right now.</strong>
            {error}
          </p>
        )}
        {typedEnough && !loading && !error && results.length === 0 && (
          <p className="state-msg">
            <strong>No matches for “{query.trim()}”.</strong>
            Try a shorter or more general name.
          </p>
        )}

        {typedEnough && results.length > 0 && (
          <ul className="results">
            {results.map((p) => (
              <li key={itemKey(p)}>
                <button type="button" className="card result" onClick={() => addItem(p)} disabled={isAdded(p)}>
                  <span className="item__icon" aria-hidden="true">
                    {p.image ? <img src={p.image} alt="" /> : emojiFor(p.name)}
                  </span>
                  <span className="item__text">
                    <span className="item__name">{p.name}</span>
                    <span className="item__meta">{[p.brand, p.category].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="result__action">{isAdded(p) ? '✓ Added' : '+'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <Link className="btn btn--outline btn--block" to="/scan">
          Use camera instead
        </Link>
        <Link className="btn btn--primary btn--block" to="/">
          Done
        </Link>
      </div>
    </>
  )
}
