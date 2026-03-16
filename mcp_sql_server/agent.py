import json
import os
import re
from pathlib import Path

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

META_FILE = Path(__file__).parent / "demo_semantic_meta.json"


def _build_schema_context() -> str:
    """
    Build a compact schema string from demo_semantic_meta.json.
    Embeds this directly into the system prompt so the agent never needs
    to call sql_db_list_tables or sql_db_schema — saving 2 LLM round-trips.
    """
    meta = json.loads(META_FILE.read_text())
    model = meta["models"][0]
    lines = ["=" * 60, f"DATABASE SCHEMA: {model['model_name']}", "=" * 60]

    for entity in model["entities"]:
        table = entity["table_name"]
        kind = "FACT" if table.startswith("fact_") else "DIM"
        lines.append(f"\n[{kind}] {table}")
        lines.append(f"  {entity['description']}")
        for col in entity["columns"]:
            desc = col["description"]
            # Flag FK columns clearly
            if "FK to" in desc or "FK →" in desc or "Surrogate integer key" in desc:
                flag = "  ★ "
            else:
                flag = "    "
            lines.append(f"{flag}{col['column_name']}: {desc}")

    lines.append("\n" + "=" * 60)
    lines.append("FOREIGN KEY RELATIONSHIPS")
    lines.append("=" * 60)
    for rel in model["relationships"]:
        lines.append(f"  {rel['from']}  →  {rel['to']}")

    lines.append("\n" + "=" * 60)
    lines.append("PRE-DEFINED KPI FORMULAS")
    lines.append("=" * 60)
    for m in model["metrics"]:
        lines.append(f"  {m['name']}: {m['expression']}")

    lines.append("\n" + "=" * 60)
    lines.append("QUERY RULES (ai_instructions)")
    lines.append("=" * 60)
    lines.append(model["ai_instructions"])

    return "\n".join(lines)


# Build schema once at module load — not per request
_SCHEMA_CONTEXT = _build_schema_context()

SYSTEM_PROMPT = f"""You are an expert SQL analyst for the connected data warehouse.
The complete schema is provided below — do NOT call any schema discovery tools.

{_SCHEMA_CONTEXT}

INSTRUCTIONS:
1. Write the SELECT query directly using the schema above.
2. Double-check your SQL: verify table names, column names, join conditions, and aggregations match the schema.
3. Output the final SQL on a line starting with exactly:
   SQL: <your_query>

CRITICAL RULES:
- SELECT only — no INSERT, UPDATE, DELETE, DROP, etc.
- Always include LIMIT <n> at the end.
- Join via integer _id FK columns (customer_id, plan_id, channel_id, etc.).
- Revenue column is total_monthly_revenue_sgd (NOT monthly_revenue_sgd).
- Churn column is customer_churned_this_month (NOT churned_this_month).
- Cast to ::numeric before any division to avoid integer truncation.
- Only fact_churn_prediction has is_future_prediction; all other fact tables are historical.
- Always alias: f = fact table, c = dim_customer, d = dim_date, p = dim_plan.
- Include a date range filter in every query."""


def build_llm():
    """
    Build and return a ChatOpenAI instance for direct SQL generation.

    Single LLM call replaces the previous ReAct agent loop (saves 2-3 round-trips).
    """
    model = os.environ.get(
        "SQL_AGENT_MODEL",
        os.environ.get("OPENROUTER_MODEL", "anthropic/claude-haiku-4.5"),
    )
    return ChatOpenAI(
        model=model,
        api_key=os.environ["OPENROUTER_API_KEY"],
        base_url="https://openrouter.ai/api/v1",
        temperature=0,
        max_tokens=512,
    )


def invoke_generate_query(llm, question: str, row_limit: int = 1000) -> dict:
    """
    Invoke the LLM and extract the SQL query from the response.
    Returns: {"sql_query": str, "explanation": str, "tables_used": list[str], "agent_steps": int}
    """
    prompt = f"{question}\n\nLimit results to at most {row_limit} rows."
    response = llm.invoke([
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=prompt),
    ])
    content = response.content
    agent_steps = 1

    sql_query = ""
    explanation = ""
    if isinstance(content, str) and "SQL:" in content:
        lines = content.splitlines()
        collecting = False
        sql_lines = []
        for line in lines:
            if line.strip().startswith("SQL:"):
                # Start collecting: grab the remainder of this line
                remainder = line.split("SQL:", 1)[1].strip()
                if remainder:
                    sql_lines.append(remainder)
                collecting = True
            elif collecting:
                # Stop at a blank line that follows the SQL block
                if not line.strip() and sql_lines:
                    break
                sql_lines.append(line)
        sql_query = "\n".join(sql_lines).strip()
        explanation = content

    tables_used = list({
        m
        for m in re.findall(r"\b(dim_\w+|fact_\w+)\b", content or "")
    })

    return {
        "sql_query": sql_query,
        "explanation": explanation,
        "tables_used": tables_used,
        "agent_steps": agent_steps,
    }


# Module-level singleton — built once at server startup
_llm = None


def get_llm():
    global _llm
    if _llm is None:
        _llm = build_llm()
    return _llm
