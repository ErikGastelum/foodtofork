// Sample data used by the UI before the real backend has these features.
// Shapes follow docs/API_CONTRACT.md. `emoji` is a mock-only extra for the card art.
// (Products are NOT mocked any more: scan and search use Jonathan's real API client.)

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

// >>> JACOB: these stand in for TheMealDB while VITE_MOCK_RECIPES=true (see src/api/recipes.js).
const r = (id, name, category, area, emoji, ingredients, instructions) => ({
  id,
  name,
  category,
  area,
  emoji,
  thumbnail: null,
  instructions,
  ingredients: ingredients.map(([n, m]) => ({ name: n, measure: m })),
})

export const MOCK_RECIPES = [
  r('52789', 'Shakshuka', 'Vegetarian', 'Egyptian', '🍳',
    [['Eggs', '4'], ['Tomatoes', '4 large'], ['Garlic', '3 cloves'], ['Onion', '1'], ['Olive Oil', '2 tbsp'], ['Paprika', '1 tsp'], ['Feta', '50g']],
    'Heat the oil in a frying pan and soften the chopped onion and garlic.\nStir in the paprika, then add the chopped tomatoes. Simmer for 10 minutes until thick.\nMake small wells in the sauce and crack in the eggs. Cover and cook for 5 minutes.\nCrumble the feta over the top and serve hot with bread.'),
  r('53001', 'Egg Fried Rice', 'Miscellaneous', 'Chinese', '🍚',
    [['Eggs', '2'], ['Jasmine Rice', '2 cups, cooked'], ['Green Onion', '3'], ['Garlic', '2 cloves'], ['Salt', 'to taste'], ['Soy Sauce', '2 tbsp'], ['Vegetable Oil', '2 tbsp']],
    'Heat the oil in a wok over high heat.\nScramble the eggs, then push them aside.\nAdd the garlic and cold rice and stir-fry for 3 minutes.\nSeason with soy sauce and salt, then toss in the sliced green onion.'),
  r('53002', 'Tomato Pasta', 'Pasta', 'Italian', '🍝',
    [['Pasta', '200g'], ['Tomatoes', '5'], ['Garlic', '2 cloves'], ['Olive Oil', '3 tbsp'], ['Basil', 'a handful'], ['Salt', 'to taste']],
    'Boil the pasta in salted water until al dente.\nFry the garlic in olive oil, add the chopped tomatoes and simmer for 15 minutes.\nToss the pasta through the sauce and finish with basil.'),
  r('53003', 'Lemon Salmon', 'Seafood', 'American', '🐟',
    [['Salmon', '2 fillets'], ['Lemon', '1'], ['Butter', '2 tbsp'], ['Garlic', '2 cloves'], ['Salt', 'to taste']],
    'Season the salmon with salt.\nMelt the butter with the garlic in a pan and sear the salmon for 4 minutes per side.\nSqueeze over the lemon juice and serve.'),
  r('53004', 'Garden Salad', 'Vegetarian', 'Greek', '🥗',
    [['Lettuce', '1 head'], ['Tomatoes', '2'], ['Cucumber', '1'], ['Feta', '50g'], ['Olive Oil', '2 tbsp'], ['Onion', '1/2'], ['Salt', 'pinch']],
    'Chop the lettuce, tomatoes, cucumber and onion into a large bowl.\nCrumble in the feta, dress with olive oil and salt, and toss.'),
  r('53005', 'Pancakes', 'Breakfast', 'American', '🥞',
    [['Flour', '1 1/2 cups'], ['Eggs', '1'], ['Milk', '1 1/4 cups'], ['Butter', '3 tbsp'], ['Sugar', '1 tbsp'], ['Baking Powder', '3 tsp'], ['Salt', '1/4 tsp'], ['Vanilla', '1 tsp']],
    'Whisk the dry ingredients together.\nMix in the milk, egg, melted butter and vanilla until just combined.\nCook ladles of batter on a hot buttered pan, flipping when bubbles form.'),
]

// Used by the Discover page (placeholder content for now).
export const HEALTHY_SWAPS = [
  { from: 'White pasta', fromEmoji: '🍝', to: 'Zucchini noodles', toEmoji: '🥒', note: '−60% carbs' },
  { from: 'Butter', fromEmoji: '🧈', to: 'Mashed avocado', toEmoji: '🥑', note: '+ healthy fats' },
  { from: 'White rice', fromEmoji: '🍚', to: 'Cauliflower rice', toEmoji: '🥦', note: '−70% calories' },
  { from: 'Soda', fromEmoji: '🥤', to: 'Sparkling lemon water', toEmoji: '🍋', note: '0 sugar' },
]
