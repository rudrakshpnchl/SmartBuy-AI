"""
query_resolution.py - Deterministic query correction and no-result suggestions.
"""
from __future__ import annotations

import difflib
import re
from typing import Any, Dict, Iterable, List, Optional

from app.services.fallback import get_mock_products


def normalize_query_text(value: str) -> str:
    return " ".join(re.findall(r"[a-z0-9]+", str(value or "").lower()))


def tokenize_query(value: str) -> List[str]:
    return re.findall(r"[a-z0-9]+", normalize_query_text(value))


def _extract_phrase_candidates(text: str, query_token_count: int) -> set[str]:
    words = tokenize_query(text)
    if not words:
        return set()

    candidates = {" ".join(words[: min(len(words), 4)])}
    desired_lengths = {
        max(1, query_token_count - 1),
        max(1, query_token_count),
        min(4, max(1, query_token_count + 1)),
    }

    for length in desired_lengths:
        if length > len(words):
            continue
        for index in range(0, len(words) - length + 1):
            candidates.add(" ".join(words[index:index + length]))

    return {candidate.strip() for candidate in candidates if candidate.strip()}


def _score_candidate(query: str, candidate: str) -> Dict[str, Any]:
    query_tokens = tokenize_query(query)
    candidate_tokens = tokenize_query(candidate)
    if not query_tokens or not candidate_tokens:
        return {
            "overall": 0.0,
            "strong_matches": 0,
            "soft_matches": 0,
            "exact_matches": 0,
        }

    phrase_ratio = difflib.SequenceMatcher(None, normalize_query_text(query), normalize_query_text(candidate)).ratio()
    token_scores = [
        max(difflib.SequenceMatcher(None, query_token, candidate_token).ratio() for candidate_token in candidate_tokens)
        for query_token in query_tokens
    ]
    overall = round(phrase_ratio * 0.7 + (sum(token_scores) / len(token_scores)) * 0.3, 4)
    return {
        "overall": overall,
        "strong_matches": sum(score >= 0.88 for score in token_scores),
        "soft_matches": sum(score >= 0.74 for score in token_scores),
        "exact_matches": len(set(query_tokens) & set(candidate_tokens)),
    }


def _is_confident_correction(query: str, candidate: Dict[str, Any], runner_up: Optional[Dict[str, Any]]) -> bool:
    token_count = max(1, len(tokenize_query(query)))
    if candidate["score"] < (0.84 if token_count == 1 else 0.86):
        return False

    if token_count > 1 and candidate["strong_matches"] < token_count - 1:
        return False

    if token_count > 1 and candidate["soft_matches"] < token_count:
        return False

    runner_up_score = runner_up["score"] if runner_up else 0.0
    return candidate["score"] - runner_up_score >= 0.04


def resolve_query_correction(
    query: str,
    autocomplete_suggestions: Iterable[str],
    catalog_products: Optional[List[Dict[str, Any]]] = None,
) -> Optional[Dict[str, str]]:
    normalized_query = normalize_query_text(query)
    if not normalized_query:
        return None

    query_token_count = max(1, len(tokenize_query(query)))
    scored_candidates: Dict[str, Dict[str, Any]] = {}

    def consider_candidate(candidate_text: str, source: str) -> None:
        normalized_candidate = normalize_query_text(candidate_text)
        if not normalized_candidate or normalized_candidate == normalized_query:
            return

        metrics = _score_candidate(query, normalized_candidate)
        existing = scored_candidates.get(normalized_candidate)
        payload = {
            "query": normalized_candidate,
            "source": source,
            "score": metrics["overall"],
            "strong_matches": metrics["strong_matches"],
            "soft_matches": metrics["soft_matches"],
            "exact_matches": metrics["exact_matches"],
        }
        if existing is None or payload["score"] > existing["score"] or (
            payload["score"] == existing["score"] and payload["source"] == "autocomplete"
        ):
            scored_candidates[normalized_candidate] = payload

    for suggestion in autocomplete_suggestions:
        for candidate_text in _extract_phrase_candidates(str(suggestion), query_token_count):
            consider_candidate(candidate_text, "autocomplete")

    for product in catalog_products or get_mock_products():
        for candidate_text in _extract_phrase_candidates(str(product.get("title", "")), query_token_count):
            consider_candidate(candidate_text, "catalog_fuzzy")

    ranked = sorted(
        scored_candidates.values(),
        key=lambda item: (item["score"], item["strong_matches"], item["exact_matches"], item["source"] == "autocomplete"),
        reverse=True,
    )
    if not ranked:
        return None

    top_candidate = ranked[0]
    runner_up = ranked[1] if len(ranked) > 1 else None
    if not _is_confident_correction(query, top_candidate, runner_up):
        return None

    return {
        "applied": True,
        "original_query": query,
        "corrected_query": top_candidate["query"],
        "source": top_candidate["source"],
    }


def build_search_suggestions(
    original_query: str,
    correction: Optional[Dict[str, str]],
    autocomplete_suggestions: Iterable[str],
    limit: int = 6,
) -> List[str]:
    suggestions: List[str] = []
    seen = {normalize_query_text(original_query)}

    values: List[str] = []
    if correction and correction.get("corrected_query"):
        values.append(correction["corrected_query"])
    values.extend(str(value or "") for value in autocomplete_suggestions)

    for value in values:
        normalized = normalize_query_text(value)
        if not normalized or normalized in seen:
            continue
        suggestions.append(normalized)
        seen.add(normalized)
        if len(suggestions) >= limit:
            break

    return suggestions
