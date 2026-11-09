import { isOwned } from './match.js'

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const SLOTS = ['lunch', 'dinner']

/** Today's short day name, e.g. 'Mon'. JS weeks start on Sunday (0), ours on Monday. */
export function today() {
  return DAYS[(new Date().getDay() + 6) % 7]
}

/** The meal in one slot, or undefined. */
export function mealAt(plan, day, slot) {
  return plan.find((m) => m.day === day && m.slot === slot)
}

/** { match, missing[] } for a planned meal against the current pantry (same rule as the detail page). */
export function mealStatus(meal, inventoryNames) {
  const missing = meal.ingredients.filter((name) => !isOwned(name, inventoryNames))
  const total = meal.ingredients.length
  const match = total ? Math.round(((total - missing.length) / total) * 100) : 0
  return { match, missing }
}