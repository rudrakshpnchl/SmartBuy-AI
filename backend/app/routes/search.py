"""
routes/search.py - POST /search endpoint.
Orchestrates the SmartBuy AI search pipeline:
  query → live shopping search → fallback catalog → normalize → match → AI decision → response
"""
import logging
import time
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, field_validator

from app.services.currency import DEFAULT_CURRENCY, get_usd_to_inr_rate
from app.services.fallback import get_mock_products
from app.services.normalizer import normalize_products
from app.services.matcher import match_products
from app.services.ai_agent import run_ai_decision
from app.services.shopping_search import (
    derive_title_suggestions,
    get_autocomplete_suggestions,
    search_google_shopping,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class SearchRequest(BaseModel):
    query: str

    @field_validator("query")
    @classmethod
    def query_must_not_be_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("query must not be empty")
        if len(v) > 200:
            raise ValueError("query too long (max 200 chars)")
        return v


class SearchResponse(BaseModel):
    query: str
    best: Dict[str, Any]
    results: list
    explanation: str
    data_source: str
    decision_source: str
    currency: str
    exchange_rate_usd_to_inr: float
    took_ms: int


class SuggestionResponse(BaseModel):
    query: str
    suggestions: list[str]
    source: str


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

@router.get("/suggestions", response_model=SuggestionResponse)
async def suggestions(
    q: str = Query(..., min_length=1, max_length=200),
    limit: int = Query(6, ge=1, le=10),
) -> SuggestionResponse:
    query = q.strip()
    if not query:
        return SuggestionResponse(query="", suggestions=[], source="none")

    autocomplete_result = await get_autocomplete_suggestions(query, limit=limit)
    suggestion_values = autocomplete_result["suggestions"]
    suggestion_source = autocomplete_result["source"]

    if not suggestion_values:
        suggestion_values = derive_title_suggestions(query, get_mock_products(), limit=limit)
        if suggestion_values:
            suggestion_source = "catalog-derived"

    return SuggestionResponse(
        query=query,
        suggestions=suggestion_values,
        source=suggestion_source,
    )

@router.post("/search", response_model=SearchResponse)
async def search(body: SearchRequest) -> SearchResponse:
    t0 = time.monotonic()
    query = body.query
    logger.info("Search request: '%s'", query)

    # ── Step 1: Search live Google Shopping results ──────────────────────────
    search_result = await search_google_shopping(query, limit=60)
    raw_products = search_result["products"]
    data_source = search_result["source"]

    # ── Step 2: Fall back to the mock catalog when live search is unavailable ─
    if not raw_products:
        logger.info("Live shopping search unavailable; falling back to mock catalog.")
        raw_products = get_mock_products()
        data_source = "mock"

    if not raw_products:
        raise HTTPException(status_code=500, detail="No product source is currently available.")

    # ── Step 3: Normalize ────────────────────────────────────────────────────
    normalized = normalize_products(raw_products)
    if not normalized:
        raise HTTPException(status_code=500, detail="Products could not be processed.")

    # ── Step 4: Match (rank only relevant products) ─────────────────────────
    top_products = match_products(normalized, query, top_n=25)
    if not top_products:
        raise HTTPException(status_code=404, detail="No matching products found for this query.")

    # ── Step 5: AI Decision ──────────────────────────────────────────────────
    ai_result = await run_ai_decision(top_products, query)

    best = ai_result["best_product"]
    reasoning = ai_result["reasoning"]
    decision_source = ai_result["source"]
    currency = DEFAULT_CURRENCY
    exchange_rate = round(get_usd_to_inr_rate(), 4)

    # Remove internal scoring key before returning
    results_clean = [{k: v for k, v in p.items() if not k.startswith("_")} for p in top_products]
    best_clean = {k: v for k, v in best.items() if not k.startswith("_")}

    took_ms = int((time.monotonic() - t0) * 1000)
    logger.info(
        "Search complete in %dms | source=%s | decision=%s",
        took_ms, data_source, decision_source,
    )

    return SearchResponse(
        query=query,
        best=best_clean,
        results=results_clean,
        explanation=reasoning,
        data_source=data_source,
        decision_source=decision_source,
        currency=currency,
        exchange_rate_usd_to_inr=exchange_rate,
        took_ms=took_ms,
    )
