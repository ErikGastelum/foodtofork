# FoodToFork Frontend

React + Vite app (mobile and desktop from one codebase). Owner: Maika.

## Run it

Requires Node.js 20+.

```bash
cd frontend
npm install
cp .env.example .env     # Windows PowerShell: copy .env.example .env
npm run dev
```

Open http://localhost:5173. Resize the window: under 768px you get the phone layout
(bottom tab bar), above it you get the desktop layout (top nav).

By default `VITE_USE_MOCK=true`, so the whole UI works with built-in sample data and no
backend. Set it to `false` in `.env` to call the real API from `docs/API_CONTRACT.md`.

## Folder map

```
src/
├── api.js              # the ONLY file that talks to the backend (mock + real)
├── context/            # inventory + grocery list state (saved in localStorage)
├── hooks/              # useMatches: inventory -> ranked recipes
├── utils/              # match helpers, emoji/category helpers
├── data/mockData.js    # sample recipes/products used while USE_MOCK=true
├── components/         # Layout, nav bars, RecipeCard, SearchBar...
├── pages/              # Pantry, Recipes, RecipeDetail, Missing, Scan, AddItem, Discover
└── styles/             # theme.css (palette) + one css file per area
```

## Hooks for teammates

Search the repo for these tags (VS Code: Ctrl/Cmd+Shift+F):

| Tag | Where | What to do |
|---|---|---|
| `>>> JONATHAN` | `src/api.js`, `src/pages/Scan.jsx` | Real Open Food Facts calls; camera + barcode decoding |
| `>>> JACOB` | `src/api.js`, `src/pages/RecipeDetail.jsx` | Real `/match` and `/recipes/{id}`; macros slot |
| `>>> ERIK` | `src/pages/AddItem.jsx` | Manual add search wiring |

## Palette

Defined once in `src/styles/theme.css`: Cream `#FBF5DF`, Emerald `#1E9E5A`,
Forest `#0F5C3A`, Mint `#D5F0DD`, Sunshine `#F5B82E`.
