"""Product endpoints (owner: Jonathan). See docs/API_CONTRACT.md."""

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request
from pydantic import BaseModel

from openfoodfacts import OpenFoodFacts, UpstreamError, is_valid_barcode

router = APIRouter(prefix="/products", tags=["products"])

UPSTREAM_DOWN = "Open Food Facts is unavailable right now, please try again"


class Product(BaseModel):
    barcode: str
    name: str
    brand: str | None = None
    image: str | None = None
    category: str | None = None


def get_off(request: Request) -> OpenFoodFacts:
    """The shared client created in main.py. Tests override this."""
    return request.app.state.off


@router.get("/search", response_model=list[Product])
async def search_products(
    q: str = Query(..., min_length=2, description="Text the user typed, at least 2 characters"),
    limit: int = Query(8, ge=1, le=20),
    off: OpenFoodFacts = Depends(get_off),
):
    """Autocomplete suggestions for manual add. Debounce calls (~300 ms)."""
    query = q.strip()
    if len(query) < 2:
        raise HTTPException(422, "q must be at least 2 characters")
    try:
        return await off.search(query, limit)
    except UpstreamError:
        raise HTTPException(502, UPSTREAM_DOWN)


@router.get(
    "/barcode/{barcode}",
    response_model=Product,
    responses={400: {"description": "Not a barcode"}, 404: {"description": "Product not found"}},
)
async def product_by_barcode(
    barcode: str = Path(..., description="8–14 digits (EAN-8, UPC-A, EAN-13, GTIN-14)"),
    off: OpenFoodFacts = Depends(get_off),
):
    """Look up a scanned barcode. 404 means: send the user to manual add."""
    code = barcode.strip()
    if not is_valid_barcode(code):
        raise HTTPException(400, "Barcode must be 8 to 14 digits")
    try:
        product = await off.get_product(code)
    except UpstreamError:
        raise HTTPException(502, UPSTREAM_DOWN)
    if product is None:
        raise HTTPException(404, "Product not found")
    return product
