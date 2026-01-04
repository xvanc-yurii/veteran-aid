import re
from io import BytesIO
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.benefit import Benefit
from app.schemas.ai import (
    GenerateApplicationRequest,
    GenerateApplicationResponse,
    AskRequest,
    AskResponse,
)
from app.services.ai_client import generate_text
from app.services.pdf_service import application_text_to_pdf_bytes

router = APIRouter(prefix="/ai", tags=["ai"])


def slugify_filename(text: str) -> str:
    text = (text or "").lower().strip()

    mapping = {
        "а": "a", "б": "b", "в": "v", "г": "h", "ґ": "g", "д": "d", "е": "e", "є": "ye",
        "ж": "zh", "з": "z", "и": "y", "і": "i", "ї": "yi", "й": "y",
        "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s",
        "т": "t", "у": "u", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh",
        "щ": "shch", "ю": "yu", "я": "ya",
        "ъ": "", "ы": "y", "э": "e", "ё": "yo",
        "ь": "", "'": "", "’": "", "`": ""
    }

    out = []
    for ch in text:
        out.append(mapping.get(ch, ch))
    text = "".join(out)

    text = re.sub(r"[^a-z0-9]+", "_", text)
    text = text.strip("_")

    if not text:
        text = "benefit"

    return text[:40]


def _build_application_prompt(current_user: User, benefit: Benefit, extra_info: str) -> str:
    applicant = getattr(current_user, "full_name", None) or current_user.email
    region = getattr(current_user, "region", "")

    prompt = (
        "Ти юридичний помічник. Сформуй заяву українською.\n"
        "ВАЖЛИВО: поверни відповідь СТРОГО у форматі нижче (з мітками), без зайвого тексту.\n\n"
        "ФОРМАТ:\n"
        "[TO]\n"
        "...\n"
        "[FROM]\n"
        "...\n"
        "[BODY]\n"
        "...\n"
        "[ATTACHMENTS]\n"
        "- ...\n"
        "- ...\n\n"
        "Де:\n"
        "- [TO] — орган/установа (1–3 рядки)\n"
        "- [FROM] — дані заявника (ПІБ, email, регіон) (1–3 рядки)\n"
        "- [BODY] — 2–6 абзаців офіційного тексту\n"
        "- [ATTACHMENTS] — список додатків (можна 0–5 пунктів)\n\n"
        "Вхідні дані:\n"
        f"Заявник: {applicant}\n"
        f"Email: {current_user.email}\n"
        f"Регіон: {region}\n"
        f"Статус: {current_user.status}\n\n"
        f"Гарантія: {benefit.title}\n"
        f"Опис: {benefit.description}\n"
        f"Орган/куди звертатись: {benefit.authority}\n"
        f"Додатково від заявника: {extra_info}\n\n"
        "Не вигадуй конкретних документів, якщо їх не дано. Якщо потрібно — напиши в [ATTACHMENTS] загальні формулювання."
    )
    return prompt



@router.post("/generate-application", response_model=GenerateApplicationResponse)
def generate_application(
    data: GenerateApplicationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    benefit = db.query(Benefit).filter(Benefit.id == data.benefit_id).first()
    if not benefit:
        raise HTTPException(status_code=404, detail="Benefit not found")

    prompt = _build_application_prompt(current_user, benefit, data.extra_info or "")
    text = generate_text(prompt)

    return GenerateApplicationResponse(text=text)


@router.post("/generate-application-pdf")
def generate_application_pdf(
    data: GenerateApplicationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    benefit = db.query(Benefit).filter(Benefit.id == data.benefit_id).first()
    if not benefit:
        raise HTTPException(status_code=404, detail="Benefit not found")

    prompt = _build_application_prompt(current_user, benefit, data.extra_info or "")
    text = generate_text(prompt)

    pdf_bytes = application_text_to_pdf_bytes(text, title="ЗАЯВА")

    slug = slugify_filename(benefit.title)
    today = date.today().isoformat()
    filename = f"zayava_{slug}_{today}.pdf"

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename=\"{filename}\"'},
    )


def _benefit_context(b: Benefit) -> str:
    docs = [x.strip() for x in (b.required_documents or "").split("\n") if x.strip()]
    statuses = [x.strip() for x in (b.eligible_statuses or "").split(",") if x.strip()]
    return (
        f"Назва: {b.title}\n"
        f"Категорія: {b.category}\n"
        f"Опис: {b.description}\n"
        f"Куди звертатись: {b.authority}\n"
        f"Хто має право: {', '.join(statuses) if statuses else '—'}\n"
        f"Документи: {', '.join(docs) if docs else '—'}\n"
    )


@router.post("/ask", response_model=AskResponse)
def ask(
    data: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (data.question or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="Empty question")

    benefits = db.query(Benefit).all()
    q_low = q.lower()

    def score(b: Benefit) -> int:
        hay = f"{b.title} {b.category} {b.description} {b.authority}".lower()
        return sum(1 for w in q_low.split() if w and w in hay)

    ranked = sorted(benefits, key=score, reverse=True)
    top = [b for b in ranked[:5] if score(b) > 0] or ranked[:3]

    context = "\n---\n".join(_benefit_context(b) for b in top)

    prompt = (
        "Ти консультант для ветеранів та їх сімей щодо соціальних гарантій.\n"
        "Відповідай українською, коротко, структуровано.\n"
        "Використовуй ТІЛЬКИ контекст нижче. Якщо не вистачає даних — попроси уточнення.\n\n"
        f"Контекст:\n{context}\n\n"
        f"Питання: {q}\n"
        f"Статус користувача: {current_user.status}\n"
        f"Регіон: {getattr(current_user, 'region', '')}\n"
    )

    answer = generate_text(prompt)
    return AskResponse(answer=answer)
