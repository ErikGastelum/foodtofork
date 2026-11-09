import { useState } from 'react'
import { itemKey, useKitchen } from '../context/KitchenContext.jsx'
import { emojiFor, groupOf } from '../utils/foodInfo.js'

const GROUPS = ['Produce', 'Dairy', 'Pantry']

// "Can't find it?" card on the manual add screen: adds an item Open Food Facts doesn't have
// (a loose apple, leftovers) by name, with a category the user picks.
//
// Render it with key={name} so the category guess resets when the typed name changes.
export default function CustomItemForm({ name }) {
  const { inventory, addItem } = useKitchen()
  const [category, setCategory] = useState(() => groupOf(name))

  // Same shape as a Product from the API, so every page treats it like any other item.
  const item = { barcode: null, name: tidy(name), brand: null, image: null, category }
  const added = inventory.some((i) => itemKey(i) === itemKey(item))

  return (
    <div className="card custom-item">
      <p className="custom-item__title">
        <span aria-hidden="true">{emojiFor(item.name)}</span> Can’t find it? Add <strong>“{item.name}”</strong> yourself.
      </p>

      <div className="custom-item__chips" role="group" aria-label="Category">
        {GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            className={'chip' + (category === g ? ' chip--active' : '')}
            aria-pressed={category === g}
            onClick={() => setCategory(g)}
          >
            {g}
          </button>
        ))}
      </div>

      <button type="button" className="btn btn--primary btn--block" onClick={() => addItem(item)} disabled={added}>
        {added ? '✓ In your kitchen' : 'Add to my kitchen'}
      </button>
    </div>
  )
}

// "  roma   tomatoes " -> "Roma tomatoes"
function tidy(text) {
  const t = text.trim().replace(/\s+/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}