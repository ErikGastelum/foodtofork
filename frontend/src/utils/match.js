// Client-side matching helpers.
//
// >>> JACOB: the REAL match % is computed on the server (POST /match). This file is used
// by the mock API and by the recipe detail page to tick off owned ingredients, so keep
// it in step with whatever rule you pick for the "open questions" in API_CONTRACT.md
// (do pantry staples like salt/oil count toward the match?).

function singular(word) {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y'
  if (word.endsWith('oes')) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

/** "Roma Tomatoes" -> "roma tomato" */
export function normalize(name = '') {
  return name
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map(singular)
    .join(' ')
}

/** True if the user's inventory has this ingredient ("Tomatoes" is owned if they have "Roma Tomatoes"). */
export function isOwned(ingredient, inventoryNames) {
  const i = ` ${normalize(ingredient)} `
  if (i.trim() === '') return false
  return inventoryNames.some((name) => {
    const n = ` ${normalize(name)} `
    return n.trim() !== '' && (n.includes(i) || i.includes(n))
  })
}

/** Turns a full recipe into the /match response shape from the API contract. */
export function toMatchResult(recipe, inventoryNames) {
  const owned = []
  const missing = []
  recipe.ingredients.forEach((ing) => (isOwned(ing.name, inventoryNames) ? owned : missing).push(ing.name))
  const total = owned.length + missing.length
  return {
    id: recipe.id,
    name: recipe.name,
    thumbnail: recipe.thumbnail,
    category: recipe.category,
    emoji: recipe.emoji, // mock-only extra
    match: total ? Math.round((owned.length / total) * 100) : 0,
    owned,
    missing,
  }
}
