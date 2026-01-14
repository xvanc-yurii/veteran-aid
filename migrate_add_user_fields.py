import sqlite3

DB = "app.db"  # або шлях до veteran-aid/app.db

con = sqlite3.connect(DB)
cur = con.cursor()

cur.execute("ALTER TABLE users ADD COLUMN full_name TEXT;")
cur.execute("ALTER TABLE users ADD COLUMN region TEXT;")

con.commit()
con.close()

print("OK")
