# FoodToFork API Contract

**Version:** Draft v0.2, for team review. Coordinator: Erik (keeps this doc up
to date). Backend owners: Jonathan and Jacob decide how each endpoint works.

This is the agreement between the frontend and backend. The frontend only ever
calls these endpoints, never Open Food Facts or TheMealDB directly. If you need
to change a request or response shape, update this file in a pull request and
tell the team first.

- **Base URL (local):** `http://localhost:8000`
- **Base URL (deployed):** `https://<our-app>.onrender.com` *(Erik fills in after deploy)*
- **Format:** JSON everywhere. Field names are `snake_case`.
- **Try it live:** every endpoint can be tested at `/docs` on the running server.

| Method | Endpoint | Backend owner | Used by (frontend) |
|---|---|---|---|
| `GET` | `/health` | Jonathan | Erik (deploy check) |
| `GET` | `/products/search?q=` | Jonathan | Erik (manual add) |
| `GET` | `/products/barcode/{barcode}` | Jonathan | Jonathan (scanner) |
| `POST` | `/match` | Jacob | Maika (recipe list) |
| `GET` | `/recipes/{id}` | Jacob | Maika (recipe detail) |

---

## Shared shapes

### Product

Returned by both product endpoints. This is also what the frontend saves in the
inventory (browser local storage).

```json
{
  "barcode": "737628064502",
  "name": "Thai Peanut Noodle Kit",
  "brand": "Simply Asia",
  "image": "https://images.openfoodfacts.org/...jpg",
  "category": "Noodles"
}
```

`brand`, `image` and `category` can be `null`. `name` is never `null`.

### Errors

Every error looks like this:

```json
{ "detail": "Product not found" }
```

| Code | Meaning | What the frontend should do |
|---|---|---|
| 400 | Bad input (e.g. letters in a barcode) | Show a "try again" message |
| 404 | Not found | For barcodes: open manual add |
| 422 | Missing or invalid parameter | Bug in the frontend call; check the request |
| 502 | Open Food Facts / TheMealDB is down | Show "service unavailable, try again" |

---

## `GET /health`

Checks the server is up.

**Response 200**
```json
{ "status": "ok" }
```

---

## `GET /products/search`

Autocomplete for manual add (frontend: Erik). Call it after the user stops typing for about
300 ms, not on every keystroke.

**Query parameters**

| Name | Required | Notes |
|---|---|---|
| `q` | yes | At least 2 characters |
| `limit` | no | 1–20, default 8 |

**Example:** `GET /products/search?q=milk&limit=2`

**Response 200:** a list of Products (can be empty `[]`).
```json
[
  { "barcode": "0011110", "name": "Whole Milk", "brand": "Organic Valley", "image": "https://...", "category": "Milks" },
  { "barcode": "0033330", "name": "Oat Milk", "brand": "Oatly", "image": null, "category": "Plant milks" }
]
```

---

## `GET /products/barcode/{barcode}`

Looks up a scanned barcode. Digits only.

**Example:** `GET /products/barcode/737628064502`

**Response 200:** one Product.
**Response 404:** not in Open Food Facts. The frontend sends the user to manual add.

---

## `POST /match`

Ranks recipes by how many of their ingredients the user already has.

**Request body:** the names of the items in the user's inventory.
```json
{ "inventory": ["Eggs", "Tomatoes", "Garlic", "Onion", "Whole Milk"] }
```

Optional fields, all backward compatible:
   - `limit` (integer, 1 or more): maximum number of recipes returned. Default: all.
   - `min_match` (integer, 0-100): minimum `match` percentage. Default: 1.
   - `sort` (`"match"` or `"name"`): highest match first, or alphabetical. Default: `"match"`.

**Response 200:** recipes sorted from highest to lowest `match`.
```json
[
  {
    "id": "52789",
    "name": "Shakshuka",
    "thumbnail": "https://www.themealdb.com/images/media/meals/...jpg",
    "category": "Vegetarian",
    "match": 86,
    "owned": ["Eggs", "Tomatoes", "Garlic", "Onion"],
    "missing": ["Feta"]
  }
]
```

`match` is a whole number from 0 to 100: owned required ingredients divided by
total required ingredients.

**Open questions for Jacob**
- Do pantry staples (salt, pepper, water, oil) count toward `match`?
They should count towards match.
- Maximum number of results? (Suggest 20.)
20 is a good number for the maximum number of results.
- Should recipes with `match` of 0 be left out?
Yes, they should be left out.
---

## `GET /recipes/{id}`

Full recipe for the detail view.

**Example:** `GET /recipes/52789`

**Response 200**
```json
{
  "id": "52789",
  "name": "Shakshuka",
  "category": "Vegetarian",
  "area": "Egyptian",
  "thumbnail": "https://...",
  "instructions": "Heat the oil in a frying pan...",
  "ingredients": [
    { "name": "Eggs", "measure": "4" },
    { "name": "Feta", "measure": "50g" }
  ]
}
```

The frontend works out owned vs. missing by comparing `ingredients` with its
inventory, or reuses the `owned`/`missing` lists from `/match`.

**Response 404:** no recipe with that ID.

---