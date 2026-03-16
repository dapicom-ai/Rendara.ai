"""
Semantic metadata loader for the LangGraph MCP server.
Reads demo_semantic_meta.json and optionally enriches with live column types.
"""
import json
from pathlib import Path

from db_pool import get_pool

META_FILE = Path(__file__).parent / "demo_semantic_meta.json"


def load_semantic_schema(model_id: str) -> dict:
    """Load and return the semantic schema for the given model_id."""
    data = json.loads(META_FILE.read_text())
    for model in data["models"]:
        if model["model_id"] == model_id:
            return dict(model)
    raise ValueError(f"Unknown model_id: {model_id!r}. Available: {[m['model_id'] for m in data['models']]}")


async def merge_with_live_schema(static_meta: dict) -> dict:
    """
    Enrich column entries with live data_type from PostgreSQL information_schema.
    Adds data_type to any column that is missing it in the static metadata.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT table_name, column_name, data_type "
            "FROM information_schema.columns "
            "WHERE table_schema = 'public' "
            "ORDER BY table_name, ordinal_position"
        )

    live = {(r["table_name"], r["column_name"]): r["data_type"] for r in rows}
    for entity in static_meta.get("entities", []):
        for col in entity.get("columns", []):
            key = (entity["table_name"], col["column_name"])
            if "data_type" not in col and key in live:
                col["data_type"] = live[key]
    return static_meta
