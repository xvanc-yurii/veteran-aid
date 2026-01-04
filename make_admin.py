from app.db.session import SessionLocal
from app.models.user import User

EMAIL = "user@admin.com"

db = SessionLocal()
try:
    u = db.query(User).filter(User.email == EMAIL).first()
    if not u:
        raise SystemExit(f"User not found: {EMAIL}. Register first.")
    u.role = "admin"
    db.commit()
    print(f"OK: {EMAIL} -> admin")
finally:
    db.close()
