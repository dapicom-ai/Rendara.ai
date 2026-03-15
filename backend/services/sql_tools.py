"""
Direct SQL tools for the telco prepaid database.
Registers tools in the MCP tool registry so the LLM can query PostgreSQL.
"""

import json
import time
import logging
from decimal import Decimal
from typing import Any

import asyncpg

logger = logging.getLogger(__name__)

DATABASE_URL = "postgresql://rendara:rendara123@localhost:5432/telco_lakehouse"

# Schema description for the LLM
SCHEMA_DESCRIPTION = """
Telco Prepaid Database — South African mobile operator

Tables:
1. customers (customer_id, msisdn, first_name, last_name, gender, age_group, region, city, registration_date, status)
   - 500 prepaid subscribers across 8 regions (Gauteng, Western Cape, KwaZulu-Natal, etc.)
   - status: active, inactive, churned
   - age_group: 18-24, 25-34, 35-44, 45-54, 55+

2. prepaid_plans (plan_id, plan_name, plan_type, price, data_mb, voice_minutes, sms_count, validity_days)
   - 12 plans: daily, weekly, monthly, addon types
   - Prices from R0.99 to R49.99

3. recharges (recharge_id, customer_id, plan_id, recharge_date, amount, channel, payment_method)
   - 15,000 recharge transactions across 2024
   - Channels: USSD, App, Retail, Online, Airtime Transfer
   - Payment: Airtime, Mobile Money, Credit Card, Bank Transfer, Voucher

4. daily_usage (usage_id, customer_id, usage_date, data_used_mb, voice_minutes_used, sms_sent, revenue)
   - ~28,000 daily usage records (Jul–Dec 2024)

5. monthly_revenue (month_id, month, region, plan_type, total_revenue, total_recharges, active_subscribers, arpu)
   - 384 monthly aggregated rows by region and plan type

6. churn_events (churn_id, customer_id, churn_date, reason, last_recharge_date, tenure_days)
   - 84 churn records with reasons (Price sensitivity, Poor network, Competitor offer, etc.)
"""


async def _get_pool():
    """Get or create connection pool."""
    if not hasattr(_get_pool, "_pool") or _get_pool._pool is None:
        _get_pool._pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=3)
    return _get_pool._pool


async def execute_sql_tool(tool_name: str, arguments: dict[str, Any]) -> tuple[bool, Any, int]:
    """
    Execute a SQL tool call. Returns (success, result, duration_ms).
    """
    start = time.monotonic()

    try:
        if tool_name == "get_schema":
            result = SCHEMA_DESCRIPTION
            duration = int((time.monotonic() - start) * 1000)
            return True, result, duration

        elif tool_name == "run_sql":
            sql = arguments.get("query", "").strip()
            if not sql:
                return False, "No query provided", 0

            # Safety: only allow SELECT
            sql_upper = sql.upper().lstrip()
            if not sql_upper.startswith("SELECT"):
                return False, "Only SELECT queries are allowed", 0

            pool = await _get_pool()
            async with pool.acquire() as conn:
                rows = await conn.fetch(sql)
                # Convert to list of dicts
                result_data = [dict(row) for row in rows[:200]]  # cap at 200 rows
                # Convert special types to JSON-safe values
                for row in result_data:
                    for k, v in row.items():
                        if isinstance(v, Decimal):
                            row[k] = float(v)
                        elif hasattr(v, 'isoformat'):
                            row[k] = v.isoformat()
                        elif isinstance(v, (bytes, memoryview)):
                            row[k] = str(v)

                duration = int((time.monotonic() - start) * 1000)
                summary = f"{len(result_data)} rows returned"
                return True, {"data": result_data, "row_count": len(result_data), "summary": summary}, duration

        else:
            return False, f"Unknown tool: {tool_name}", 0

    except Exception as e:
        duration = int((time.monotonic() - start) * 1000)
        logger.error(f"SQL tool error: {e}")
        return False, str(e), duration


def get_sql_tool_schemas() -> list[dict[str, Any]]:
    """Return OpenAI-compatible tool schemas for SQL tools."""
    return [
        {
            "type": "function",
            "function": {
                "name": "get_schema",
                "description": "Get the database schema description including all tables, columns, and data ranges. Call this first to understand the available data before writing SQL.",
                "parameters": {"type": "object", "properties": {}, "required": []},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "run_sql",
                "description": "Execute a read-only SQL query against the telco prepaid PostgreSQL database. Only SELECT statements are allowed. Returns up to 200 rows.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The SQL SELECT query to execute",
                        }
                    },
                    "required": ["query"],
                },
            },
        },
    ]
