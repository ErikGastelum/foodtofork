# Accounts (branch `account_creation`)

**Owner:** Jonathan (skeleton + functionality). UI: Maika. Deploy/storage: Erik. Permissions/test accounts: Jacob.

Three ways to use FoodToFork:

| Who | Where their kitchen is saved | How |
|---|---|---|
| **Guest** | This browser only (localStorage, same as v1) | "Continue as guest" on `/welcome` |
| **Account** | The backend database: follows them to any device | Sign up / sign in |
| **Family (recipe share link)** | Nothing: they just open the link | Open `/share/<id>`, no account needed |

Sign-up asks for **first name, last name, username and password**. A guest who signs up keeps
everything they already added: the frontend sends the guest kitchen along with the request.

### Sharing a saved recipe

On **Recipes → My recipes** (a tab next to *Best match* and *Fewest missing*), each saved recipe has
**Share recipe & grocery list** and **Remove**. Guests see their saved recipes there too, but need an
account to share. `/recipes?tab=mine` links straight to the tab. The owner
gives it a **title** ("Saturday Dinner") and optional **notes** ("6pm at our place"). The link shows:

- the title, notes, and "Jonathan T. is making <recipe>" (first name + last initial only)
- the recipe, linked to its full page
- **Still needed**: ingredients the owner doesn't have. Anyone can type their name and tap
  **I'll get it**. First person wins; they can undo with the same name. The owner sees who's
  bringing what and can clear a claim.
- **Already has**: ingredients in the owner's pantry when the share was made. **Update from my
  pantry** re-checks this later (claims stay).

One share per saved recipe. Removing the saved recipe or **Stop sharing** kills the link.

The **admin** account comes from `backend/.env` and can list accounts, set a new password
for anyone, and delete accounts.

## Run it locally

```bash
cd backend
cp .env.example .env          # then set ADMIN_USERNAME / ADMIN_PASSWORD
pip install -r requirements.txt
uvicorn main:app --reload
```

Accounts are stored in `backend/foodtofork.db` (SQLite, git-ignored). Delete that file
to start over. If the server says *"Accounts database is out of date"*, the tables changed
since you last ran it: delete the file and restart. (Tests never touch it; they use an
in-memory database.) Sign in as the admin at `/login`, then go to **Account → Manage accounts**.

Try the API without the frontend at http://localhost:8000/docs: sign up or log in, copy the
`token`, click **Authorize**, paste it.

## Deploying (Erik)

Vercel (and Render's free tier) wipe files on every deploy, so the SQLite file would lose
every account. Use a free Postgres database instead:

1. Vercel dashboard → **Storage / Marketplace → Neon** → create a database.
2. Copy its connection string and set it as `DATABASE_URL` wherever the **backend** runs.
   Use the pooled URL if Neon offers both. `postgres://…` and `postgresql://…` both work.
3. Also set `ADMIN_USERNAME` and `ADMIN_PASSWORD` there. The admin is created on the
   first start; changing these later does **not** change an existing admin's password.
4. `FRONTEND_URL` must still be the frontend's exact address (CORS).

Tables are created automatically on startup. There's nothing to run by hand.

## API

Signed-in requests send `Authorization: Bearer <token>`. Errors are `{"detail": "<message>"}`,
written so the frontend can show them as-is.

```
User    = { id, username, first_name, last_name, role: "user" | "admin", created_at }
Kitchen = { inventory: Product[], grocery_list: string[], saved_recipes: [{ id, name, thumbnail }] }
Share   = { id, title, notes, owner_name, recipe: { id, name, thumbnail },
            items: [{ id, name, measure, have, claimed_by }], updated_at }
```

| Method | Endpoint | Who | Body → Response |
|---|---|---|---|
| `POST` | `/auth/signup` | anyone | `{username, password, first_name, last_name, kitchen?}` → `201 {token, user}`; `409` name taken |
| `POST` | `/auth/login` | anyone | `{username, password}` → `{token, user}`; `401` wrong username or password |
| `POST` | `/auth/logout` | signed in | → `204` (ends this session) |
| `GET` | `/auth/me` | signed in | → `User`; `401` expired / reset / deleted |
| `PATCH` | `/me` | signed in | `{first_name, last_name}` → `User` |
| `GET` | `/me/kitchen` | signed in | → `Kitchen` |
| `PUT` | `/me/kitchen` | signed in | `Kitchen` → `Kitchen` (replaces the whole thing) |
| `POST` | `/me/password` | signed in | `{current_password, new_password}` → `204`; signs out other devices |
| `DELETE` | `/me` | signed in | `{password}` → `204` |
| `GET` | `/me/shares` | signed in | → `Share[]` |
| `POST` | `/me/shares` | signed in | `{recipe_id, title, notes?}` → `201 Share`; `409` already shared; `404` unknown recipe |
| `PATCH` | `/me/shares/{id}` | owner | `{title?, notes?}` → `Share` |
| `POST` | `/me/shares/{id}/refresh` | owner | → `Share` (re-checks `have` against the pantry; claims stay) |
| `DELETE` | `/me/shares/{id}` | owner | → `204`; link stops working |
| `DELETE` | `/me/shares/{id}/items/{item_id}/claim` | owner | → `Share` (clears someone's claim) |
| `GET` | `/share/{id}` | anyone | → `Share`; `404` bad/old link |
| `POST` | `/share/{id}/items/{item_id}/claim` | anyone | `{name}` → `Share`; `409` someone else has it; `400` owner already has it |
| `POST` | `/share/{id}/items/{item_id}/unclaim` | anyone | `{name}` → `Share`; `403` if it isn't the same name |
| `GET` | `/admin/users` | admin | → `[{id, username, first_name, last_name, role, created_at, pantry_items, saved_recipes, shares}]` |
| `POST` | `/admin/users/{id}/password` | admin | `{new_password}` → `204`; signs that user out everywhere |
| `DELETE` | `/admin/users/{id}` | admin | → `204`; `400` if you try to delete yourself |

Rules: usernames are 3–30 letters, numbers, `.`, `-` or `_`, and are not case-sensitive.
Passwords need 8+ characters. Sessions last 30 days.

## Security notes

- Passwords are hashed with PBKDF2-SHA256 (600,000 rounds, random salt per user). Plain
  passwords are never stored or logged.
- The database stores a SHA-256 of each session token, not the token itself.
- Wrong username and wrong password return the same error, so the form doesn't reveal which
  usernames exist.
- Share links use a random id, so they can't be guessed by counting. They only show the
  owner's first name and last initial, the recipe, and its ingredients.
- Claims are first-come: one database UPDATE that only succeeds if the item is unclaimed, so two
  people tapping at once can't both win. A claim is just a typed name (no accounts), so it's
  honor-system; the owner can clear any claim.
- Not done yet (fine for a class demo): login rate limiting, email verification, password reset by email.

## Frontend map

| File | What it does |
|---|---|
| `src/context/AuthContext.jsx` | `useAuth()`: `status`, `user`, `isAdmin`, `login`, `signup`, `logout`, `continueAsGuest` |
| `src/context/KitchenContext.jsx` | Same `useKitchen()` as before, plus `savedRecipes`, `toggleSaved`, `isSaved`, `syncStatus`, `kitchenLoading`. Saves to the account when signed in, to localStorage for guests. |
| `src/api/client.js` | Adds the token to every request, plus the account calls |
| `src/components/RequireAccess.jsx` | `RequireChoice` (first visit → `/welcome`), `RequireAdmin` |
| `src/components/MyRecipes.jsx` | The "My recipes" tab on the Recipes page: saved recipes + their shares |
| `src/components/SavedRecipeCard.jsx` | One saved recipe in that tab: share form, link, who's bringing what, remove |
| `src/pages/Welcome.jsx`, `Login.jsx`, `Signup.jsx`, `Account.jsx`, `Admin.jsx`, `Shared.jsx` | Bare-bones pages. **Maika: restyle freely**; `styles/account.css` is placeholder layout. |

Pages open to everyone: `/welcome`, `/login`, `/signup`, `/share/:id`, `/recipes/:id`.
Everything else needs a choice (account or guest); `/admin` needs an admin.

## Tests

`cd backend && pytest` runs `tests/test_accounts.py` (sign up/in, names, per-account kitchens,
admin powers, permissions) and `tests/test_shares.py` (recipe shares, claims, undo, refresh).
`tests/conftest.py` points every test at an in-memory database, so `foodtofork.db` is never touched.
