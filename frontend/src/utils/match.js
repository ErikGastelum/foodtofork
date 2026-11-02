// Client-side ingredient matching, used by the recipe detail page to tick off what you own.
//
// >>> JACOB: this mirrors backend/matching.py so the ticks on the detail page agree with the
// match % on the recipe cards (which comes from POST /match). If you change the rule there,
// change it here too.

function singular(word) {
  if (word.length > 3) {
    if (word.endsWith('ies')) return word.slice(0, -3) + 'y'
    if (word.endsWith('oes')) return word.slice(0, -2)
    if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  }
  return word
}

function words(text) {
  return new Set(text.toLowerCase().replace(/-/g, ' ').split(/\s+/).filter(Boolean).map(singular))
}

const isSubset = (a, b) => [...a].every((w) => b.has(w))

/** True if the inventory has this ingredient: "oil" matches "olive oil" (word subset), but "egg" does not match "eggplant". */
export function isOwned(ingredient, inventoryNames) {
  const i = words(ingredient)
  if (i.size === 0) return false
  return inventoryNames.some((name) => {
    const n = words(name)
    return n.size > 0 && (isSubset(i, n) || isSubset(n, i))
  })
}
