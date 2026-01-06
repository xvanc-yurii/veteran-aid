from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, SessionLocal
from app.db.base import Base
from app.routers.admin import router as admin_router

# ВАЖЛИВО: імпортуємо моделі, щоб Base “побачив” таблиці
from app.models.user import User  # noqa: F401
from app.models.benefit import Benefit  # noqa: F401

from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.benefits import router as benefits_router
from app.models.case import Case  # noqa: F401
from app.routers.cases import router as cases_router
from app.routers.ai import router as ai_router
from app.models.case_document import CaseDocument  # noqa: F401
from app.models.case_history import CaseHistory  # noqa: F401




Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(benefits_router)
app.include_router(cases_router)
app.include_router(ai_router)
app.include_router(admin_router)


@app.get("/")
def root():
    return {"status": "ok", "app": settings.app_name}

# Seed: заповнити кілька гарантій при першому запуску
@app.on_event("startup")
def seed_benefits():
    db = SessionLocal()
    try:
        if db.query(Benefit).count() == 0:
            db.add_all([
                Benefit(
                    title="Компенсація за житлово-комунальні послуги",
                    category="housing",
                    description="Пільги/компенсації на оплату ЖКП для визначених категорій.",
                    authority="Органи соцзахисту / ЦНАП",
                    required_documents="Паспорт\nІПН\nПідтвердження статусу\nЗаява",
                    eligible_statuses="veteran,ubd,family,disabled",
                ),
                Benefit(
                    title="Одноразова грошова допомога (приклад)",
                    category="payments",
                    description="Приклад виплати за певних умов (для демонстрації).",
                    authority="Соцзахист / ЦНАП",
                    required_documents="Паспорт\nІПН\nДокумент про статус\nРеквізити IBAN\nЗаява",
                    eligible_statuses="veteran,ubd",
                ),
                Benefit(
                    title="Пільги на медичні послуги (приклад)",
                    category="medical",
                    description="Пріоритет/пільгові умови отримання медичних послуг (демо).",
                    authority="Медзаклад / сімейний лікар / НСЗУ",
                    required_documents="Паспорт\nПідтвердження статусу",
                    eligible_statuses="veteran,ubd,disabled",
                ),
            ])
            db.commit()
    finally:
        db.close()
