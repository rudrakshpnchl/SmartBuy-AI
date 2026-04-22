"""
image_utils.py - Shared helpers for reliable product thumbnails.
"""
from base64 import b64encode
from html import escape
from urllib.parse import urlparse


def build_placeholder_thumbnail(title: str) -> str:
    safe_title = escape((title or "Product")[:48])
    svg = (
        "<svg xmlns='http://www.w3.org/2000/svg' width='640' height='640' viewBox='0 0 640 640'>"
        "<defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>"
        "<stop stop-color='#111827'/><stop offset='1' stop-color='#1f2937'/>"
        "</linearGradient></defs>"
        "<rect width='640' height='640' rx='32' fill='url(#g)'/>"
        "<circle cx='320' cy='230' r='96' fill='#374151'/>"
        "<rect x='170' y='360' width='300' height='30' rx='15' fill='#6b7280'/>"
        "<rect x='140' y='415' width='360' height='22' rx='11' fill='#4b5563'/>"
        f"<text x='320' y='520' text-anchor='middle' font-family='Arial' font-size='28' fill='#e5e7eb'>{safe_title}</text>"
        "</svg>"
    )
    encoded = b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


def is_valid_thumbnail(value: str) -> bool:
    text = str(value or "").strip()
    if not text:
        return False
    if text.startswith("data:image/"):
        return True

    parsed = urlparse(text)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def normalize_thumbnail(value: str, title: str) -> str:
    text = str(value or "").strip()
    if is_valid_thumbnail(text):
        return text
    return build_placeholder_thumbnail(title)
