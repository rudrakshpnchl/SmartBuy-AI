"""
main.py - FastAPI application entry point for SmartBuy AI.
"""
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routes.search import router as search_router

BACKEND_DIR = Path(__file__).resolve().parent.parent
PLACEHOLDER_API_KEYS = {"your_anthropic_api_key_here"}
load_dotenv(BACKEND_DIR / ".env")

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SmartBuy AI backend starting...")
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    api_key_set = bool(api_key) and api_key not in PLACEHOLDER_API_KEYS
    logger.info(
        "Anthropic API key: %s",
        "SET" if api_key_set else "NOT CONFIGURED (rule-based fallback active)",
    )
    yield
    logger.info("SmartBuy AI backend shutting down.")


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SmartBuy AI",
    description="Agentic price comparison system with AI-powered decision making.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "SmartBuy AI"}
