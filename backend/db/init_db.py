"""
Initialize demo.db from schema.sql.
Run: python backend/db/init_db.py
"""

import sqlite3
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SCHEMA_PATH = os.path.join(SCRIPT_DIR, "schema.sql")
DB_PATH = os.path.join(SCRIPT_DIR, "..", "demo.db")


def init_db():
    with open(SCHEMA_PATH, "r") as f:
        schema = f.read()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.executescript(schema)
    conn.commit()
    conn.close()

    print(f"demo.db initialized at: {os.path.abspath(DB_PATH)}")
    print("Tables created: conversations, messages, dashboards, pins, reports")


if __name__ == "__main__":
    init_db()
