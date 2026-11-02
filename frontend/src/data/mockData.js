// Sample data for the UI. Recipes and products come from the real backend now (Jacob's /match
// and /recipes, Jonathan's /products); this file only holds the demo kitchen and Discover placeholders.

// "Load sample kitchen" button on the empty state. 12 items, like the mockup.
const s = (name, category, brand = null) => ({ barcode: `sample-${name.toLowerCase().replace(/\W+/g, '-')}`, name, brand, image: null, category })
export const SAMPLE_INVENTORY = [
  s('Eggs', 'Dairy', '12 ct'),
  s('Roma Tomatoes', 'Produce'),
  s('Cheddar Cheese', 'Dairy'),
  s('Jasmine Rice', 'Pantry'),
  s('Garlic', 'Produce'),
  s('Onion', 'Produce'),
  s('Olive Oil', 'Pantry'),
  s('Paprika', 'Pantry'),
  s('Butter', 'Dairy'),
  s('Whole Milk', 'Dairy'),
  s('Green Onion', 'Produce'),
  s('Salt', 'Pantry'),
]

// Used by the Discover page (placeholder content for now).
export const HEALTHY_SWAPS = [
  { from: 'White pasta', fromEmoji: '🍝', to: 'Zucchini noodles', toEmoji: '🥒', note: '−60% carbs' },
  { from: 'Butter', fromEmoji: '🧈', to: 'Mashed avocado', toEmoji: '🥑', note: '+ healthy fats' },
  { from: 'White rice', fromEmoji: '🍚', to: 'Cauliflower rice', toEmoji: '🥦', note: '−70% calories' },
  { from: 'Soda', fromEmoji: '🥤', to: 'Sparkling lemon water', toEmoji: '🍋', note: '0 sugar' },
]
