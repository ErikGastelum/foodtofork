// Small display helpers: an emoji for each food and a simple group for the filter chips.
//
// >>> JONATHAN: Open Food Facts categories are free-form ("Plant milks", "Noodles").
// The chips in the mockup are only Produce / Dairy / Pantry, so groupOf() squeezes
// whatever category comes back into one of those. Improve the keyword lists if needed.

const EMOJI = [
  ['egg', '🥚'], ['tomato', '🍅'], ['cheese', '🧀'], ['feta', '🧀'], ['basil', '🌿'], ['rice', '🍚'], ['milk', '🥛'],
  ['butter', '🧈'], ['garlic', '🧄'], ['onion', '🧅'], ['oil', '🫒'], ['oat', '🥣'],
  ['cookie', '🍪'], ['salmon', '🐟'], ['lemon', '🍋'], ['pasta', '🍝'], ['soy', '🧂'],
  ['salt', '🧂'], ['paprika', '🌶️'], ['flour', '🌾'], ['lettuce', '🥬'], ['cucumber', '🥒'],
]

export function emojiFor(name = '') {
  const n = name.toLowerCase()
  const hit = EMOJI.find(([key]) => n.includes(key))
  return hit ? hit[1] : '🛒'
}

// Card / hero backdrop color by recipe category (matches the mockup: eggs = sunshine,
// rice = leaf, pasta = coral, fish = sky). Unknown categories get a stable color from the id.
const TINT_BY_CATEGORY = { Vegetarian: 'sun', Breakfast: 'sun', Miscellaneous: 'leaf', Pasta: 'coral', Seafood: 'sky' }
const TINTS = ['sun', 'leaf', 'coral', 'sky']

export function tintFor(recipe) {
  if (TINT_BY_CATEGORY[recipe.category]) return TINT_BY_CATEGORY[recipe.category]
  return TINTS[[...String(recipe.id)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % TINTS.length]
}

const GROUP_WORDS = {
  Dairy: ['milk', 'cheese', 'butter', 'egg', 'yogurt', 'cream', 'feta'],
  Produce: ['tomato', 'garlic', 'onion', 'lettuce', 'cucumber', 'lemon', 'basil', 'apple', 'banana', 'potato', 'carrot', 'spinach', 'broccoli'],
}

/** Returns 'Dairy' | 'Produce' | 'Pantry' for an item or a plain name. */
export function groupOf(item) {
  const text = (typeof item === 'string' ? item : `${item.name} ${item.category ?? ''}`).toLowerCase()
  for (const [group, words] of Object.entries(GROUP_WORDS)) {
    if (words.some((w) => text.includes(w))) return group
  }
  return 'Pantry'
}
