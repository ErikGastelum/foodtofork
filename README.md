# FoodToFork

Cook with what you already have.

## Overview

People routinely buy groceries and then default to familiar meals, which leaves ingredients unused and wasted. Existing recipe apps like Yummly and Tasty are search-first: the user looks for a recipe, then buys ingredients for it. FoodToFork flips this around. It starts from what a user already has in their kitchen and surfaces what they can cook from it.

FoodToFork is a responsive, mobile-friendly web app where a user builds a live inventory of groceries and instantly sees recipes ranked by how many of the required ingredients they already have. The loop of **scan → inventory updates → recipes appear** is designed to run in under 5 seconds and be usable by a non-technical person with no onboarding.

**Project type:** one responsive web app that works in desktop and mobile browsers, rather than a separate native app, so the team can focus its 12-week timeline on one codebase.

## Decisions

| Decision | Choice |
|---|---|
| Platform | Single responsive web app (native wrapper is a stretch goal) |
| Accounts | Guest-only for v1; inventory stored in browser local storage |
| Backend | Python + FastAPI |
| Frontend | React + Vite *(to confirm)* |
| Recipe data | TheMealDB, cached locally by the backend |
| Product data | Open Food Facts |

## Features (Requirements)

- **Barcode scan add:** device camera + barcode decoding library looks up the product via the Open Food Facts API and adds it to inventory with name, image and category. Unrecognized barcodes route to Manual add.
- **Manual add:** text entry with autocomplete against Open Food Facts search; the fallback when a barcode isn't recognized or there's no camera.
- **Inventory view:** simple list where users can add and remove items.
- **Recipe matching:** ranks recipes by the percentage of required ingredients the user already owns, and lists the missing ingredients for each.
- **Recipe detail view:** full ingredient list, instructions and image from TheMealDB, with owned vs. missing ingredients visually distinguished.
- **Responsive design:** works in desktop and mobile browsers for the live demo, with a clean UI.

## Stretch Goals

- **Dietary filters:** applied on top of ranked recipe results.
- **User accounts / cross-device sync:** added only if time remains after the MVP is stable.
- **Native app wrapper:** Capacitor around the finished web app, attempted once the core product is stable.

## Repository Structure

```
foodtofork/
├── frontend/          # React app (UI, barcode scanner, local storage inventory)
├── backend/           # FastAPI server (API proxy, caching, recipe matching)
│   ├── main.py          # API routes
│   ├── requirements.txt
│   ├── tests/
│   ├── data/            # cached TheMealDB recipes (recipes.json)
│   └── scripts/         # one-off scripts, e.g. fetch_recipes.py
├── docs/
│   ├── API_CONTRACT.md  # endpoint agreement between frontend and backend
│   └── DEPLOY.md        # how to deploy the backend to Render
└── README.md
```

## Getting Started

### Backend

Requires Python 3.11+.

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Run the tests with `pytest` from the `backend/` folder.

The API runs at http://localhost:8000. Interactive docs are at http://localhost:8000/docs.

### Frontend

Requires Node.js 20+.

```bash
cd frontend
npm install
npm run dev
```

The app runs at http://localhost:5173.

## API Contract (draft)

Full details, including request and response examples, are in [docs/API_CONTRACT.md](docs/API_CONTRACT.md).

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Returns `{"status": "ok"}` |
| `GET` | `/products/barcode/{code}` | Product name, image and category from Open Food Facts |
| `GET` | `/products/search?q=oat` | Autocomplete suggestions for manual add |
| `POST` | `/match` | Body: `{"inventory": ["eggs", "tomatoes"]}`; returns recipes ranked by match % with missing ingredients |
| `GET` | `/recipes/{id}` | Full recipe: ingredients, instructions, image |

Example `/match` response:

```json
[
  { "id": "52789", "name": "Shakshuka", "thumbnail": "https://...", "match": 86, "missing": ["Feta"] }
]
```

## Contributing

- `main` is protected; work on a branch and open a pull request.
- Name branches by feature, e.g. `feature/barcode-scan`, `fix/match-rounding`.
- Get one teammate's review before merging.

## Division of Labor

| Member | Role | Responsibilities |
|---|---|---|
| Erik Gastelum | Full-stack | Repo setup, manual add screen, API contract coordination, deployment, testing |
| Maika Pangilinan | Front-end | UX/UI for home/inventory view, recipe list and detail views, color palette |
| Jonathan Torres | Back-end | Open Food Facts API, barcode library, product endpoints, frontend–backend connection |
| Jacob Micu | Back-end | TheMealDB API, recipe matching algorithm, recipe detail data |