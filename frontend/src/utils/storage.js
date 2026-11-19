// Browser storage keys and safe read/write helpers (owner: Jonathan).
// Guests keep their kitchen here. Signed-in users keep only their session token
// here; their kitchen lives in the backend database.

export const KEYS = {
  inventory: 'foodtofork.inventory',
  grocery: 'foodtofork.grocery',
  saved: 'foodtofork.saved',
  token: 'foodtofork.token',
  user: 'foodtofork.user',
  guest: 'foodtofork.guest', // "1" once someone picks "Continue as guest"
  visitorName: 'foodtofork.visitorName', // name typed on a share link, so they don't retype it
}

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback // storage blocked or corrupted
  }
}

export function writeJSON(key, value) {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore: the app still works for this session */
  }
}

export const readList = (key) => {
  const v = readJSON(key, [])
  return Array.isArray(v) ? v : []
}

/** The guest's kitchen, in the backend's shape. Sent along at sign-up so nothing is lost. */
export function readGuestKitchen() {
  return {
    inventory: readList(KEYS.inventory),
    grocery_list: readList(KEYS.grocery),
    saved_recipes: readList(KEYS.saved),
  }
}
