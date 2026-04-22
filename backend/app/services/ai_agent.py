"""
ai_agent.py - AI Decision Engine using the Gemini API.
Sends top matched products to Gemini and returns best pick + reasoning.
Falls back to rule-based decision if API key is missing.
"""
import json
import logging
import os
from typing import List, Dict, Any

import httpx

from app.services.currency import format_inr_amount

logger = logging.getLogger(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
GEMINI_MODEL = "gemini-2.5-flash"
PLACEHOLDER_API_KEYS = {"your_gemini_api_key_here"}
ALLOWED_REASONING_TOKENS = {
    "a", "an", "and", "as", "at", "best", "better", "between", "by", "choice", "compare",
    "compared", "cost", "costs", "days", "delivers", "delivery", "for", "from", "good",
    "has", "higher", "in", "is", "it", "its", "less", "lower", "more", "most", "of",
    "offers", "on", "option", "overall", "over", "pick", "price", "priced", "priced",
    "rating", "rated", "safer", "selected", "shipping", "slightly", "solid", "source",
    "stock", "strong", "than", "the", "this", "trade", "tradeoffs", "value", "while",
    "with", "alternative", "alternatives", "availability", "available", "balanced",
}


# ---------------------------------------------------------------------------
# Rule-based fallback (no API key needed)
# ---------------------------------------------------------------------------

def _rule_based_decision(products: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Simple rule-based best-product selection when AI is unavailable.
    Scores each product: 60% rating + 40% inverse-price.
    """
    if not products:
        return {"best_product": None, "reasoning": "No products to compare.", "source": "rule-based"}

    max_price = max(p.get("price", 1) for p in products) or 1

    def score(p):
        rating_norm = p.get("rating", 0) / 5.0
        price_norm = 1 - (p.get("price", 0) / max_price)
        return 0.6 * rating_norm + 0.4 * price_norm

    best = max(products, key=score)

    reasoning_parts = [
        f"Selected **{best['title']}** from {best['source']}.",
        f"It has a strong rating of {best['rating']}/5 with a price of {format_inr_amount(best['price'])}.",
    ]
    if best.get("delivery"):
        reasoning_parts.append(f"Delivery estimate: {best['delivery']}.")

    alternatives = [p for p in products if p["title"] != best["title"]]
    if alternatives:
        alt_titles = ", ".join(a["title"][:40] for a in alternatives[:2])
        reasoning_parts.append(f"Alternatives considered: {alt_titles}.")

    return {
        "best_product": best,
        "reasoning": " ".join(reasoning_parts),
        "source": "rule-based",
    }


# ---------------------------------------------------------------------------
# AI-powered decision
# ---------------------------------------------------------------------------

def _build_prompt(products: List[Dict[str, Any]], query: str) -> str:
    candidate_rows = []
    for product in products:
        candidate_rows.append({
            "candidate_id": product.get("_candidate_id"),
            "title": product.get("title"),
            "price": product.get("price"),
            "currency": product.get("currency"),
            "rating": product.get("rating"),
            "source": product.get("source"),
            "delivery": product.get("delivery"),
            "reviews_count": product.get("reviews_count"),
            "in_stock": product.get("in_stock"),
            "snippet": product.get("snippet"),
            "relevance_score": product.get("relevance_score"),
        })

    products_json = json.dumps(candidate_rows, indent=2)
    return f"""You are a smart product recommendation assistant.

User searched for: "{query}"

Here are the top candidate products found across multiple stores:

{products_json}

Your task:
1. Compare these products based on price, rating, delivery time, and overall value.
2. All prices are already converted to INR. Treat the `price` field as Indian rupees and use the rupee symbol (₹) in your explanation.
3. Select the BEST option for the user.
4. Provide a concise explanation (2-4 sentences) of why it's the best choice.
5. Mention what trade-offs the alternatives offer.
6. Use ONLY the facts present in the candidate list. Do not infer missing specs or features.

Respond ONLY with valid JSON in this exact format:
{{
  "best_candidate_id": "candidate_id from the list",
  "reasoning": "Your explanation here"
}}"""


def _tokenize_reasoning(text: str) -> set[str]:
    import re

    return set(re.findall(r"[a-z0-9]+", text.lower()))


def _reasoning_is_grounded(reasoning: str, products: List[Dict[str, Any]], query: str) -> bool:
    context_tokens = _tokenize_reasoning(query)
    for product in products:
        context_tokens.update(_tokenize_reasoning(product.get("title", "")))
        context_tokens.update(_tokenize_reasoning(product.get("source", "")))
        context_tokens.update(_tokenize_reasoning(product.get("delivery", "")))
        context_tokens.update(_tokenize_reasoning(product.get("snippet", "")))
        context_tokens.update(_tokenize_reasoning(str(product.get("price", ""))))
        context_tokens.update(_tokenize_reasoning(str(product.get("rating", ""))))
        context_tokens.update(_tokenize_reasoning(str(product.get("reviews_count", ""))))
        context_tokens.update(_tokenize_reasoning("in stock" if product.get("in_stock") else "out of stock"))

    reasoning_tokens = _tokenize_reasoning(reasoning)
    unknown_tokens = {
        token for token in reasoning_tokens
        if len(token) > 4 and token not in context_tokens and token not in ALLOWED_REASONING_TOKENS
    }
    return not unknown_tokens


async def run_ai_decision(
    products: List[Dict[str, Any]],
    query: str,
) -> Dict[str, Any]:
    """
    Call Gemini to pick the best product and explain why.
    Returns rule-based result if GEMINI_API_KEY is not set.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key in PLACEHOLDER_API_KEYS:
        logger.info("GEMINI_API_KEY not configured – using rule-based decision.")
        return _rule_based_decision(products)

    prompt = _build_prompt(products, query)

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 512,
            "responseMimeType": "application/json",
        },
    }

    headers = {
        "x-goog-api-key": api_key,
        "content-type": "application/json",
    }

    try:
        timeout = httpx.Timeout(connect=3.0, read=15.0, write=10.0, pool=5.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                GEMINI_API_URL.format(model=GEMINI_MODEL),
                json=payload,
                headers=headers,
            )
            response.raise_for_status()

        data = response.json()
        candidates = data.get("candidates") or []
        parts = (((candidates[0] or {}).get("content") or {}).get("parts")) if candidates else None
        raw_text = next(
            (
                part.get("text", "").strip()
                for part in (parts or [])
                if isinstance(part, dict) and part.get("text")
            ),
            "",
        )
        if not raw_text:
            raise KeyError("Gemini response did not include text content.")

        # Strip markdown code fences if present
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]

        ai_result = json.loads(raw_text)
        best_candidate_id = str(ai_result.get("best_candidate_id", "")).strip()
        reasoning = ai_result.get("reasoning", "No reasoning provided.")
        if not best_candidate_id:
            raise KeyError("Gemini response did not include best_candidate_id.")
        if not _reasoning_is_grounded(reasoning, products, query):
            raise ValueError("Gemini reasoning included unsupported facts.")

        # Find matching product object
        best_product = next(
            (p for p in products if p.get("_candidate_id") == best_candidate_id),
            None,
        )
        if best_product is None:
            raise KeyError(f"Unknown candidate ID returned by Gemini: {best_candidate_id}")

        return {
            "best_product": best_product,
            "reasoning": reasoning,
            "source": "gemini-ai",
        }

    except httpx.HTTPStatusError as e:
        logger.error("Gemini API HTTP error %s: %s", e.response.status_code, e.response.text)
    except httpx.RequestError as e:
        logger.error("Gemini API request error: %s", e)
    except (json.JSONDecodeError, KeyError, IndexError, ValueError) as e:
        logger.error("Failed to parse AI response: %s", e)

    logger.info("AI call failed – falling back to rule-based decision.")
    return _rule_based_decision(products)
