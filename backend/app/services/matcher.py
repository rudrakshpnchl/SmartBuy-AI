"""
matcher.py - Match and rank products relevant to a search query.
Uses keyword overlap + composite score to surface the best candidates.
"""
import logging
import re
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


def _tokenize(text: str) -> set:
    """Lowercase, split on non-alphanumeric chars, drop stop-words."""
    stop_words = {"the", "and", "for", "with", "from", "this", "that", "a", "an", "in", "of"}
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    return {t for t in tokens if t not in stop_words and len(t) > 1}


def _relevance_score(
    product: Dict[str, Any],
    query_tokens: set,
    min_price: float,
    max_price: float,
) -> float:
    """
    Compute a relevance score combining:
      - keyword overlap with title  (0–1)
      - normalized rating           (0–1)
      - inverse-price factor        (0–1)
    """
    title_tokens = _tokenize(product.get("title", ""))
    if not query_tokens:
        overlap = 1.0
    elif not title_tokens:
        overlap = 0.0
    else:
        overlap = len(query_tokens & title_tokens) / len(query_tokens)

    rating_norm = product.get("rating", 0) / 5.0

    price = max(float(product.get("price", 0) or 0), 0.0)
    if max_price <= min_price:
        price_score = 1.0
    else:
        price_score = 1.0 - ((price - min_price) / (max_price - min_price))
        price_score = max(0.0, min(1.0, price_score))

    # Weighted composite
    score = overlap * 0.50 + rating_norm * 0.35 + price_score * 0.15
    return round(score, 4)


def match_products(
    products: List[Dict[str, Any]],
    query: str,
    top_n: int = 5,
) -> List[Dict[str, Any]]:
    """
    Score and rank products by relevance to the query.
    Returns top_n products sorted by composite relevance score (descending).
    Products must share at least one searchable token with the query.
    """
    if not products:
        return []

    query_tokens = _tokenize(query)
    if not query_tokens:
        logger.info("No searchable keywords extracted from query '%s'", query)
        return []

    candidates = []
    for p in products:
        title_tokens = _tokenize(p.get("title", ""))
        overlap = len(query_tokens & title_tokens) / len(query_tokens) if title_tokens else 0.0
        if overlap <= 0:
            continue

        candidates.append(dict(p))

    if not candidates:
        logger.info("Matched 0 products (top 0 selected) for query '%s'", query)
        return []

    price_values = [max(float(candidate.get("price", 0) or 0), 0.0) for candidate in candidates]
    min_price = min(price_values)
    max_price = max(price_values)

    scored = []
    for product_copy in candidates:
        score = _relevance_score(product_copy, query_tokens, min_price, max_price)
        product_copy["relevance_score"] = score
        scored.append(product_copy)

    # Sort: relevance first, then rating as tiebreaker
    scored.sort(key=lambda x: (x["relevance_score"], x.get("rating", 0)), reverse=True)

    top = scored[:top_n]
    logger.info("Matched %d products (top %d selected) for query '%s'", len(scored), len(top), query)
    return top
