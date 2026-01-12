import sqlite3
from pathlib import Path

# ⚠️ ШЛЯХ ДО БАЗИ ДАНИХ
DB_PATH = Path("app.db")  # якщо база називається інакше — скажи

if not DB_PATH.exists():
    raise FileNotFoundError(f"DB file not found: {DB_PATH.resolve()}")

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

print("Adding columns to cases table...")

cur.execute(
    "ALTER TABLE cases ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT ''"
)
cur.execute(
    "ALTER TABLE cases ADD COLUMN description VARCHAR(2000) NOT NULL DEFAULT ''"
)

conn.commit()
conn.close()

print("✅ Migration finished successfully")
