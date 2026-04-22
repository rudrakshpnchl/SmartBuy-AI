"""
fallback.py - Loads the curated SmartBuy AI mock product catalog.
"""
import json
import os
import logging
from typing import List, Dict, Any

from app.services.image_utils import normalize_thumbnail

logger = logging.getLogger(__name__)

MOCK_DATA_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "mock_data.json"
)


def _ensure_thumbnail(product: Dict[str, Any]) -> Dict[str, Any]:
    enriched = dict(product)
    enriched["thumbnail"] = normalize_thumbnail(
        enriched.get("thumbnail", ""),
        str(enriched.get("title", "Product")),
    )
    return enriched


def load_mock_data() -> List[Dict[str, Any]]:
    """Load the full product catalog from mock_data.json."""
    try:
        with open(MOCK_DATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        products = data.get("products", [])
        if not isinstance(products, list):
            logger.error("mock_data.json 'products' payload must be a list.")
            return []
            
        for p in products:
            if "currency" not in p:
                p["currency"] = "USD"

        return [_ensure_thumbnail(product) for product in products]
    except FileNotFoundError:
        logger.error("mock_data.json not found at %s", MOCK_DATA_PATH)
        return []
    except json.JSONDecodeError as e:
        logger.error("Failed to parse mock_data.json: %s", e)
        return []


def get_mock_products() -> List[Dict[str, Any]]:
    """Return the full curated mock product catalog."""
    products = load_mock_data()
    logger.info("Loaded %d products from the mock catalog.", len(products))
    return products


def get_fallback_products(query: str) -> List[Dict[str, Any]]:
    """Backward-compatible alias for older imports."""
    logger.info("Using mock catalog for query '%s'.", query)
    return get_mock_products()
