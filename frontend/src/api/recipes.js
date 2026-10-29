// ============================================================================
// api/recipes.js: the recipe calls the pages use (owner: Maika for the switch,
// Jacob for the real endpoints).
//
// Product calls (barcode scan, manual-add search) are Jonathan's and live in
// ./client.js, which the Scan and Add pages use directly.
//
// Recipes are different: POST /match and GET /recipes/{id} aren't on the backend
// yet, so this file can answer with built-in sample recipes:
//
//   VITE_MOCK_RECIPES=true   (default)  -> sample recipes, no backend needed
//   VITE_MOCK_RECIPES=false             -> the real backend, through ./client.js
//
// >>> JACOB: when your endpoints are merged and running, set VITE_MOCK_RECIPES=false
// in frontend/.env.local. Nothing else in the UI has to change.
// ============================================================================
import { api, ApiError } from './client.js'
import { MOCK_RECIPES } from '../data/mockData.js'
import { toMatchResult } from '../utils/match.js'

const USE_MOCK_RECIPES = import.meta.env.VITE_MOCK_RECIPES !== 'false'
const pause = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms))

// POST /match   body: { inventory: ["Eggs", ...] }   -> MatchResult[] (best first)
// Result: { id, name, thumbnail, category, match, owned[], missing[] }
export async function matchRecipes(inventoryNames) {
  if (!USE_MOCK_RECIPES) return api.matchRecipes(inventoryNames)
  await pause()
  return MOCK_RECIPES.map((rec) => toMatchResult(rec, inventoryNames))
    .filter((rec) => rec.match > 0)
    .sort((a, b) => b.match - a.match)
}

// GET /recipes/{id}   -> { id, name, category, area, thumbnail, instructions, ingredients[{name, measure}] }
export async function getRecipe(id) {
  if (!USE_MOCK_RECIPES) return api.getRecipe(id)
  await pause()
  const found = MOCK_RECIPES.find((rec) => rec.id === id)
  if (!found) throw new ApiError(404, 'Recipe not found')
  return found
}
