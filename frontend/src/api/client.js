// FoodToFork API client (owner: Jonathan).
//
// The ONE place the frontend talks to the backend. Every screen imports from
// here instead of calling fetch() itself, so the base URL and error handling
// live in one spot. Endpoints and shapes follow docs/API_CONTRACT.md.
//
//   import { api, ApiError } from '../api/client';
//   const product = await api.getProductByBarcode('737628064502'); // null if unknown
//
// The backend URL comes from VITE_API_URL (see frontend/.env.example).
//
// Accounts: when someone is signed in, AuthContext calls setAuthToken(token) and
// every request below carries "Authorization: Bearer <token>". Guests have no
// token and the product/recipe calls work exactly the same for them.

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

let authToken = null;
/** Set (or clear with null) the session token sent with every request. */
export function setAuthToken(token) {
  authToken = token || null;
}

export class ApiError extends Error {
  /**
   * @param {number} status HTTP status, or 0 if the server couldn't be reached
   * @param {string} message the backend's `detail`, safe to show to users
   */
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, signal, keepalive } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      keepalive, // lets a last save finish while the tab is closing
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err; // caller cancelled; not an error
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
  }

  if (!res.ok) {
    let message = 'Something went wrong, try again.';
    try {
      const data = await res.json();
      if (typeof data.detail === 'string') message = data.detail;
    } catch {
      /* non-JSON error body: keep the default message */
    }
    if (res.status >= 500) message = 'Service unavailable, try again in a moment.';
    throw new ApiError(res.status, message);
  }
  return res.status === 204 ? null : res.json();
}

/**
 * @typedef {Object} Product
 * @property {string} barcode
 * @property {string} name
 * @property {string|null} brand
 * @property {string|null} image
 * @property {string|null} category
 */

export const api = {
  /** GET /health -> { status: "ok" } */
  health: (opts) => request('/health', opts),

  /**
   * GET /products/search — autocomplete for manual add.
   * Debounce ~300 ms (or use the useProductSearch hook, which does).
   * @returns {Promise<Product[]>}
   */
  searchProducts: (q, { limit = 8, signal } = {}) => {
    const params = new URLSearchParams({ q, limit: String(limit) });
    return request(`/products/search?${params}`, { signal });
  },

  /**
   * GET /products/barcode/{barcode}
   * @returns {Promise<Product|null>} null when the barcode isn't known (-> manual add)
   */
  getProductByBarcode: async (barcode, { signal } = {}) => {
    try {
      return await request(`/products/barcode/${encodeURIComponent(barcode)}`, { signal });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  /**
   * POST /match — inventory is a list of item names. Backend: Jacob.
   * limit (optional, 1 or more): max recipes returned; leave it out to get every match.
   */
  matchRecipes: (inventory, { limit, signal } = {}) =>
    request('/match', { method: 'POST', body: limit ? { inventory, limit } : { inventory }, signal }),

  /** GET /recipes/{id} — full recipe for the detail view. Backend: Jacob. */
  getRecipe: (id, { signal } = {}) => request(`/recipes/${encodeURIComponent(id)}`, { signal }),

  // ---- Accounts (Jonathan). Full contract: docs/ACCOUNTS.md ----------------
  // User = { id, username, first_name, last_name, role: "user" | "admin", created_at }
  // Kitchen = { inventory: Product[], grocery_list: string[], saved_recipes: {id, name, thumbnail}[] }

  /** POST /auth/signup -> { token, user }. kitchen (optional) = the guest's kitchen to keep. */
  signup: ({ username, password, firstName, lastName, kitchen }) =>
    request('/auth/signup', {
      method: 'POST',
      body: { username, password, first_name: firstName, last_name: lastName, kitchen },
    }),
  /** POST /auth/login -> { token, user }. 401 = wrong username or password. */
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  /** POST /auth/logout: ends this session on the server. */
  logout: () => request('/auth/logout', { method: 'POST' }),
  /** GET /auth/me -> User. 401 = token expired or account gone. */
  me: (opts) => request('/auth/me', opts),
  /** PATCH /me -> User. Change first/last name. */
  updateProfile: (firstName, lastName) => request('/me', { method: 'PATCH', body: { first_name: firstName, last_name: lastName } }),

  /** GET /me/kitchen -> Kitchen */
  getKitchen: (opts) => request('/me/kitchen', opts),
  /** PUT /me/kitchen: replaces the whole kitchen. KitchenContext calls this for you. */
  saveKitchen: (kitchen, opts = {}) => request('/me/kitchen', { method: 'PUT', body: kitchen, ...opts }),
  /** POST /me/password: other devices get signed out. */
  changePassword: (currentPassword, newPassword) =>
    request('/me/password', { method: 'POST', body: { current_password: currentPassword, new_password: newPassword } }),
  /** DELETE /me: deletes the signed-in account. */
  deleteAccount: (password) => request('/me', { method: 'DELETE', body: { password } }),

  // ---- Sharing a saved recipe (Jonathan) --------------------------------------
  // Share = { id, title, notes, owner_name, recipe: {id, name, thumbnail},
  //           items: [{ id, name, measure, have, claimed_by }], updated_at }
  // The public link is  <site>/share/<share.id>

  /** GET /me/shares -> Share[] (signed in) */
  myShares: (opts) => request('/me/shares', opts),
  /** POST /me/shares -> Share. 409 = this recipe is already shared. */
  createShare: (recipeId, title, notes = '') => request('/me/shares', { method: 'POST', body: { recipe_id: recipeId, title, notes } }),
  /** PATCH /me/shares/{id} -> Share. Pass only what changes: { title?, notes? } */
  editShare: (shareId, changes) => request(`/me/shares/${encodeURIComponent(shareId)}`, { method: 'PATCH', body: changes }),
  /** POST /me/shares/{id}/refresh -> Share. Re-check "have" against the pantry; claims stay. */
  refreshShare: (shareId) => request(`/me/shares/${encodeURIComponent(shareId)}/refresh`, { method: 'POST' }),
  /** DELETE /me/shares/{id}: the link stops working. */
  deleteShare: (shareId) => request(`/me/shares/${encodeURIComponent(shareId)}`, { method: 'DELETE' }),
  /** DELETE /me/shares/{id}/items/{itemId}/claim -> Share. Owner clears someone's claim. */
  clearClaim: (shareId, itemId) => request(`/me/shares/${encodeURIComponent(shareId)}/items/${itemId}/claim`, { method: 'DELETE' }),

  /** GET /share/{id} -> Share. No sign-in needed. */
  getShare: (shareId, opts) => request(`/share/${encodeURIComponent(shareId)}`, opts),
  /** POST /share/{id}/items/{itemId}/claim -> Share. "I'll get it." 409 = someone else already is. */
  claimItem: (shareId, itemId, name) =>
    request(`/share/${encodeURIComponent(shareId)}/items/${itemId}/claim`, { method: 'POST', body: { name } }),
  /** POST /share/{id}/items/{itemId}/unclaim -> Share. Must be the same name that claimed it. */
  unclaimItem: (shareId, itemId, name) =>
    request(`/share/${encodeURIComponent(shareId)}/items/${itemId}/unclaim`, { method: 'POST', body: { name } }),

  /** Admin only. GET /admin/users -> [{ id, username, first_name, last_name, role, created_at, pantry_items, saved_recipes, shares }] */
  adminListUsers: (opts) => request('/admin/users', opts),
  adminResetPassword: (userId, newPassword) =>
    request(`/admin/users/${userId}/password`, { method: 'POST', body: { new_password: newPassword } }),
  adminDeleteUser: (userId) => request(`/admin/users/${userId}`, { method: 'DELETE' }),
};

export { BASE_URL };
