// ============================================================================
// api/recipes.js: the recipe calls the pages use.
//
// These go to Jacob's endpoints (POST /match and GET /recipes/{id}) through ./client.js.
// Product calls (barcode scan, manual-add search) are Jonathan's and also live in client.js.
// ============================================================================
import { api } from './client.js'

// How many recipes the Recipes and Pantry pages ask for (API_CONTRACT.md suggests 20).
// Pass null instead to get every match (the Missing page does, so it can find the closest ones).
export const MATCH_LIMIT = 20

// POST /match   body: { inventory: ["Eggs", ...], limit? }   -> MatchResult[] (best first)
// Result: { id, name, thumbnail, category, match, owned[], missing[] }
export function matchRecipes(inventoryNames, limit = MATCH_LIMIT) {
  return api.matchRecipes(inventoryNames, { limit })
}

// GET /recipes/{id}   -> { id, name, category, area, thumbnail, instructions, ingredients[{name, measure}] }
export function getRecipe(id) {
  return api.getRecipe(id)
}
