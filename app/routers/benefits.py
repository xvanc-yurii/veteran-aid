from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.benefit import Benefit
from app.schemas.benefit import BenefitCreate, BenefitUpdate, BenefitOut
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.services.ai_client import generate_text

router = APIRouter(prefix="/benefits", tags=["benefits"])

def _to_out(b: Benefit) -> BenefitOut:
    return BenefitOut(
        id=b.id,
        title=b.title,
        category=b.category,
        description=b.description,
        authority=b.authority,
        required_documents=[x for x in b.required_documents.split("\n") if x.strip()],
        eligible_statuses=[x for x in b.eligible_statuses.split(",") if x.strip()],
    )

@router.get("", response_model=List[BenefitOut])
def list_benefits(db: Session = Depends(get_db)):
    items = db.query(Benefit).order_by(Benefit.id.desc()).all()
    return [_to_out(x) for x in items]

@router.get("/{benefit_id}/explain")
def explain_benefit(
    benefit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    benefit = db.query(Benefit).filter(Benefit.id == benefit_id).first()
    if not benefit:
        raise HTTPException(status_code=404, detail="Benefit not found")

    docs = [x.strip() for x in (benefit.required_documents or "").split("\n") if x.strip()]
    statuses = [x.strip() for x in (benefit.eligible_statuses or "").split(",") if x.strip()]

    prompt = (
        "Ти консультант для ветеранів та їх сімей.\n"
        "Поясни українською мовою, чому ця соціальна гарантія підходить (або може не підходити) користувачу.\n"
        "Відповідь: 4–8 речень, чітко, без вигадування фактів.\n"
        "Якщо не вистачає даних — попроси уточнення (1–2 питання).\n\n"
        f"Профіль користувача:\n"
        f"- ПІБ/Ім'я: {getattr(current_user, 'full_name', '')}\n"
        f"- Email: {current_user.email}\n"
        f"- Статус: {current_user.status}\n"
        f"- Регіон: {getattr(current_user, 'region', '')}\n\n"
        f"Гарантія:\n"
        f"- Назва: {benefit.title}\n"
        f"- Категорія: {benefit.category}\n"
        f"- Опис: {benefit.description}\n"
        f"- Орган: {benefit.authority}\n"
        f"- Хто має право: {', '.join(statuses) if statuses else '—'}\n"
        f"- Документи: {', '.join(docs) if docs else '—'}\n"
    )

    text = generate_text(prompt)
    return {"explanation": text}


@router.get("/{benefit_id}", response_model=BenefitOut)
def get_benefit(benefit_id: int, db: Session = Depends(get_db)):
    b = db.query(Benefit).filter(Benefit.id == benefit_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Benefit not found")
    return _to_out(b)

@router.get("/recommended/me", response_model=List[BenefitOut])
def recommended_for_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    my_status = (current_user.status or "unknown").strip().lower()

    items = db.query(Benefit).all()
    out: list[BenefitOut] = []

    for b in items:
        allowed = [x.strip().lower() for x in b.eligible_statuses.split(",") if x.strip()]

        # якщо користувач не заповнив статус — показуємо базове ("veteran")
        if my_status == "unknown" or not my_status:
            if "veteran" in allowed:
                out.append(_to_out(b))
        else:
            if my_status in allowed or "veteran" in allowed:
                out.append(_to_out(b))

    return out

# --- ADMIN ONLY CRUD ---

@router.post("", response_model=BenefitOut)
def create_benefit(
    data: BenefitCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    b = Benefit(
        title=data.title,
        category=data.category,
        description=data.description,
        authority=data.authority,
        required_documents="\n".join(data.required_documents),
        eligible_statuses=",".join(data.eligible_statuses),
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return _to_out(b)

@router.put("/{benefit_id}", response_model=BenefitOut)
def update_benefit(
    benefit_id: int,
    data: BenefitUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    b = db.query(Benefit).filter(Benefit.id == benefit_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Benefit not found")

    if data.title is not None: b.title = data.title
    if data.category is not None: b.category = data.category
    if data.description is not None: b.description = data.description
    if data.authority is not None: b.authority = data.authority
    if data.required_documents is not None: b.required_documents = "\n".join(data.required_documents)
    if data.eligible_statuses is not None: b.eligible_statuses = ",".join(data.eligible_statuses)

    db.commit()
    db.refresh(b)
    return _to_out(b)

@router.delete("/{benefit_id}")
def delete_benefit(
    benefit_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    b = db.query(Benefit).filter(Benefit.id == benefit_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Benefit not found")

    db.delete(b)
    db.commit()
    return {"deleted": True, "id": benefit_id}
