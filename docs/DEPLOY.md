# Deploying the Backend to Render

**Owner:** Erik. **Before you start:** Jonathan or Jacob must have merged
backend code into `main`, including `backend/main.py` and
`backend/requirements.txt`. Render has nothing to run until then.

Render has a free tier that runs Python web apps straight from GitHub. Every
push to `main` redeploys automatically.

## One-time setup

1. Make sure `main` on GitHub contains `backend/main.py` and `backend/requirements.txt`.
2. Go to https://render.com and sign up with your GitHub account.
3. Click **New +** → **Web Service**, then pick the `foodtofork` repo.
4. Fill in the settings:

   | Setting | Value |
   |---|---|
   | Name | `foodtofork-api` (this becomes the URL) |
   | Root Directory | `backend` |
   | Runtime | Python 3 |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
   | Instance Type | Free |

5. Under **Environment Variables**, add:

   | Key | Value |
   |---|---|
   | `PYTHON_VERSION` | `3.12.7` |
   | `FRONTEND_URL` | the deployed frontend URL, once Maika's app is live (e.g. `https://foodtofork.vercel.app`) |

6. Click **Create Web Service** and wait for the build log to say it's live
   (a few minutes the first time).

## Check it worked

Open `https://foodtofork-api.onrender.com/health` in a browser. You should see:

```json
{"status":"ok"}
```

Then try `https://foodtofork-api.onrender.com/products/search?q=milk`, which
should return real products. Put the URL in `docs/API_CONTRACT.md` and share it
with the team. If the start command fails, check with the backend owners
that the app is still in `main.py` and named `app`.

## Things to know

- **The free tier sleeps** after 15 minutes without traffic, and the first
  request after that takes 30–60 seconds. Before the demo, open `/health` a
  minute early to wake it up.
- **Build failing?** Read the build log on Render. The usual causes are a wrong
  Root Directory or a package missing from `requirements.txt`.
- **CORS errors in the browser console** mean `FRONTEND_URL` doesn't exactly
  match the frontend's address (no trailing slash).