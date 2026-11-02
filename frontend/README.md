# FoodToFork Frontend

React + Vite app (mobile and desktop from one codebase). Owner: Maika.

## Run it

Requires Node.js 20+. The easiest way (starts the backend and frontend together) is
`run.sh` (Mac/Linux) or `run.bat` (Windows) from the top folder; see `First_Time.txt`.

To run just the frontend:

```bash
cd frontend
npm install
cp .env.example .env.local     # optional; Windows PowerShell: copy .env.example .env.local
npm run dev
```

Open http://localhost:5173. Resize the window: under 768px you get the phone layout
(bottom tab bar), above it you get the desktop layout (top nav).

Everything except the empty "Load sample kitchen" button talks to the real backend (barcode
scan, Add an item search, recipe matching, recipe details), so start it too (`run.sh`, or
see the top-level README). Without the backend those screens show a "could not reach the
server" message. **Load sample kitchen** on the empty state fills the pantry with 12 demo
items so you can try the recipes without scanning anything.

## Settings (`frontend/.env.local`)

| Variable | Default | Meaning |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Where the backend lives |

`npm run phone` is Jonathan's HTTPS mode for testing the camera from a phone on the same Wi-Fi.

## Folder map

```
src/
├── api/
│   ├── client.js       # Jonathan: every real backend call (products, match, recipes)
│   └── recipes.js      # recipe calls used by the pages (Jacob's /match and /recipes/{id})
├── context/            # inventory + grocery list state (saved in localStorage)
├── hooks/              # useMatches (inventory -> ranked recipes), useProductSearch (Jonathan)
├── utils/              # match helpers, emoji/category helpers
├── data/mockData.js    # the "sample kitchen" (12 demo items) and Discover placeholders
├── components/         # Layout, nav bars, RecipeCard, SearchBar, BarcodeScanner (Jonathan)...
├── pages/              # Pantry, Recipes, RecipeDetail, Missing, Scan, AddItem (Discover comes later; its route shows "coming soon")
└── styles/             # theme.css (palette) + one css file per area
```

## Hooks for teammates

Search the repo for these tags (VS Code: Ctrl/Cmd+Shift+F):

| Tag | Where | What to do |
|---|---|---|
| `>>> JONATHAN` | `src/pages/Scan.jsx`, `src/utils/foodInfo.js` | Scan flow uses your scanner + client. Item categories come from Open Food Facts; improve `groupOf()` if needed |
| `>>> JACOB` | `src/api/recipes.js`, `src/utils/match.js` | Switch to the real `/match` and `/recipes/{id}`. The recipe detail page isn't built yet (its route shows "coming soon") |
| `>>> ERIK` | `src/pages/AddItem.jsx` | Manual add screen (already uses Jonathan's search hook) |

## Palette

Defined once in `src/styles/theme.css`: Cream `#FBF5DF`, Emerald `#1E9E5A`,
Forest `#0F5C3A`, Mint `#D5F0DD`, Sunshine `#F5B82E`.
