import asyncio
import os
import time

from mcp.server.fastmcp import FastMCP

from agent import get_llm, invoke_generate_query
from db_pool import get_pool
from semantic_meta import load_semantic_schema, merge_with_live_schema
from safety import validate_select_only, enforce_row_limit, execute_with_timeout

_port = int(os.environ.get("MCP_PORT", "8001"))
mcp = FastMCP(
    "Telco-Prepaid-Demo",
    host="0.0.0.0",
    port=_port,
    message_path="/message",
)


def _json_safe(value):
    """Convert non-JSON-serialisable types to primitives."""
    from decimal import Decimal

    if isinstance(value, Decimal):
        return float(value)
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, (bytes, memoryview)):
        return str(value)
    return value


@mcp.tool()
async def get_semantic_model_schema(model_id: str) -> dict:
    """
    Retrieve the business semantic schema for a data model.
    Returns tables, column descriptions, FK relationships, pre-defined KPI metrics,
    and query hints. Mirror of Power BI Get Semantic Model Schema.
    """
    meta = load_semantic_schema(model_id)
    return await merge_with_live_schema(meta)


@mcp.tool()
async def generate_query(model_id: str, question: str, row_limit: int = 1000) -> dict:
    """
    Generate a validated SQL SELECT query from a plain-English question using a
    LangGraph SQL agent. Does NOT execute the query.
    Returns: {sql_query, explanation, tables_used, agent_steps}.
    Mirror of Power BI Generate Query tool.
    """
    loop = asyncio.get_event_loop()
    llm = get_llm()
    result = await loop.run_in_executor(
        None, lambda: invoke_generate_query(llm, question, row_limit)
    )
    if not result.get("sql_query"):
        raise ValueError(
            "The SQL agent could not generate a valid query for that question. "
            "The question may be too ambiguous or reference data not in the schema."
        )
    return result


@mcp.tool()
async def execute_query(
    model_id: str,
    sql_query: str,
    row_limit: int = 1000,
    timeout_seconds: int = 30,
) -> dict:
    """
    Execute a SQL SELECT query and return structured results.
    Returns: {columns, rows, row_count, truncated, execution_ms}.
    Mirror of Power BI Execute Query tool.
    """
    validate_select_only(sql_query)
    sql_query = enforce_row_limit(sql_query, row_limit)
    start = time.monotonic()
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await execute_with_timeout(conn.fetch(sql_query), timeout_seconds)
    columns = list(rows[0].keys()) if rows else []
    data = [[_json_safe(v) for v in row] for row in rows]
    return {
        "columns": columns,
        "rows": data,
        "row_count": len(data),
        "truncated": len(data) >= row_limit,
        "execution_ms": int((time.monotonic() - start) * 1000),
        "model_id": model_id,
        "sql_executed": sql_query,
    }


if __name__ == "__main__":
    mcp.run(transport="sse")
