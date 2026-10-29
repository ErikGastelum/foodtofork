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

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

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

async function request(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
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
  return res.json();
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

  /** POST /match — inventory is a list of item names. Backend: Jacob. */
  matchRecipes: (inventory, { signal } = {}) =>
    request('/match', { method: 'POST', body: { inventory }, signal }),

  /** GET /recipes/{id} — full recipe for the detail view. Backend: Jacob. */
  getRecipe: (id, { signal } = {}) => request(`/recipes/${encodeURIComponent(id)}`, { signal }),
};

export { BASE_URL };
