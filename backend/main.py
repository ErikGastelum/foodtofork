"""FoodToFork API. Run from backend/:  uvicorn main:app --reload"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import products
from openfoodfacts import OpenFoodFacts


@asynccontextmanager
async def lifespan(app: FastAPI):
    # One shared HTTP client (and cache) for the whole server.
    async with OpenFoodFacts.make_http_client() as http:
        app.state.off = OpenFoodFacts(http)
        yield


app = FastAPI(title="FoodToFork API", version="0.1.0", lifespan=lifespan)

# --- CORS: which websites may call this API from the browser --------------
# Local Vite dev server is always allowed. On Render, set FRONTEND_URL to the
# deployed frontend (comma-separate several). Trailing slashes are ignored.
allowed_origins = {"http://localhost:5173", "http://127.0.0.1:5173"}
allowed_origins |= {
    url.strip().rstrip("/")
    for url in os.getenv("FRONTEND_URL", "").split(",")
    if url.strip()
}
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(allowed_origins),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# --- Errors: every error is {"detail": "<message>"} (see API_CONTRACT) ----
@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    messages = []
    for err in exc.errors():
        field = ".".join(str(p) for p in err.get("loc", ()) if p not in ("query", "path", "body"))
        messages.append(f"{field}: {err.get('msg')}" if field else err.get("msg", "Invalid request"))
    return JSONResponse(status_code=422, content={"detail": "; ".join(messages)})


# --- Routes ---------------------------------------------------------------
@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}


app.include_router(products.router)
# Recipe routes (/match, /recipes/{id}) go here, e.g.:
# app.include_router(recipes.router)
