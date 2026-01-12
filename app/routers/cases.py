from io import BytesIO
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.benefit import Benefit
from app.models.case import Case
from app.models.case_document import CaseDocument
from app.models.case_history import CaseHistory
from app.models.case_artifact import CaseArtifact

from app.schemas.case_progress import CaseProgressOut
from app.schemas.case import CaseCreate, CaseOut, CaseUpdate
from app.schemas.case_ai import CaseAskRequest, CaseAskResponse
from app.schemas.case_artifact import CaseArtifactOut
from app.schemas.case_document import CaseDocumentOut, CaseDocumentUpdate, ALLOWED_DOC_STATUSES

from app.services.ai_client import generate_text
from app.services.pdf_service import application_text_to_pdf_bytes

router = APIRouter(prefix="/cases", tags=["cases"])


def _ensure_case_access(c: Case, current_user: User):
    if c.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")


# =======================
# CREATE CASE
# =======================
@router.post("", response_model=CaseOut)
def create_case(
    data: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    benefit = db.query(Benefit).filter(Benefit.id == data.benefit_id).first()
    if not benefit:
        raise HTTPException(status_code=404, detail="Benefit not found")

    title = (data.title or "").strip()
    description = (data.description or "").strip()

    # Якщо title не передали — можна підставити щось дефолтне
    # але краще вимагати title на фронті
    if not title:
        title = "Без назви"

    c = Case(
        user_id=current_user.id,
        benefit_id=data.benefit_id,
        status="draft",
        title=title,
        description=description,
        # старе поле
        note=(data.note or "").strip(),
    )
    db.add(c)
    db.flush()
    db.refresh(c)

    # створення required документів по бенефіту
    docs = [x.strip() for x in (benefit.required_documents or "").split("\n") if x.strip()]
    for t in docs:
        db.add(CaseDocument(case_id=c.id, title=t, status="required"))

    # історія
    db.add(CaseHistory(case_id=c.id, status="draft", comment="Справу створено"))

    db.commit()
    db.refresh(c)
    return c


# =======================
# LIST CASES
# =======================
@router.get("", response_model=list[CaseOut])
def list_cases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Case)
    if current_user.role != "admin":
        q = q.filter(Case.user_id == current_user.id)
    return q.order_by(Case.id.desc()).all()


# =======================
# GET ONE CASE
# =======================
@router.get("/{case_id}", response_model=CaseOut)
def get_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    _ensure_case_access(c, current_user)
    return c


# =======================
# UPDATE CASE
# =======================
@router.patch("/{case_id}", response_model=CaseOut)
def update_case(
    case_id: int,
    data: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    _ensure_case_access(c, current_user)

    if data.status is not None:
        c.status = data.status

    # ✅ нові поля
    if data.title is not None:
        c.title = data.title.strip()
    if data.description is not None:
        c.description = data.description.strip()

    # 🔁 старе поле
    if data.note is not None:
        c.note = data.note

    db.add(CaseHistory(case_id=c.id, status=c.status, comment="Оновлення справи"))

    db.commit()
    db.refresh(c)
    return c


# =======================
# CASE DOCUMENTS
# =======================
@router.get("/{case_id}/documents", response_model=list[CaseDocumentOut])
def list_documents(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    _ensure_case_access(c, current_user)

    return (
        db.query(CaseDocument)
        .filter(CaseDocument.case_id == case_id)
        .order_by(CaseDocument.id)
        .all()
    )


# =======================
# CASE HISTORY
# =======================
@router.get("/{case_id}/history")
def case_history(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    _ensure_case_access(c, current_user)

    return (
        db.query(CaseHistory)
        .filter(CaseHistory.case_id == case_id)
        .order_by(CaseHistory.created_at.desc())
        .all()
    )


# =======================
# AI ASSISTANT FOR CASE
# =======================
@router.post("/{case_id}/ask", response_model=CaseAskResponse)
def ask_about_case(
    case_id: int,
    data: CaseAskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = (data.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Empty question")

    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    _ensure_case_access(c, current_user)

    benefit = db.query(Benefit).filter(Benefit.id == c.benefit_id).first()
    if not benefit:
        raise HTTPException(status_code=404, detail="Benefit not found")

    docs = (
        db.query(CaseDocument)
        .filter(CaseDocument.case_id == case_id)
        .order_by(CaseDocument.id)
        .all()
    )

    history = (
        db.query(CaseHistory)
        .filter(CaseHistory.case_id == case_id)
        .order_by(CaseHistory.created_at.desc())
        .limit(5)
        .all()
    )

    docs_text = "\n".join(f"- {d.title}: {d.status}" for d in docs) or "—"
    hist_text = "\n".join(f"- {h.created_at}: {h.status} ({h.comment})" for h in history) or "—"

    prompt = (
        "Ти AI-консультант для ветеранів та їх сімей.\n"
        "Відповідай українською, коротко і по пунктах.\n"
        "Не вигадуй фактів. Якщо даних недостатньо — задай 1–2 уточнення.\n\n"
        f"Користувач:\n- Статус: {current_user.status}\n\n"
        f"Справa:\n- ID: {c.id}\n- Статус: {c.status}\n- Назва: {c.title}\n- Опис: {c.description}\n- Примітка: {c.note}\n\n"
        f"Гарантія:\n- Назва: {benefit.title}\n- Опис: {benefit.description}\n- Куди звертатись: {benefit.authority}\n\n"
        f"Документи:\n{docs_text}\n\n"
        f"Останні зміни:\n{hist_text}\n\n"
        f"Питання: {question}\n"
    )

    answer = generate_text(prompt)
    return CaseAskResponse(answer=answer)


# =======================
# CASE ARTIFACTS: LIST
# =======================
@router.get("/{case_id}/artifacts", response_model=list[CaseArtifactOut])
def list_case_artifacts(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    _ensure_case_access(c, current_user)

    return (
        db.query(CaseArtifact)
        .filter(CaseArtifact.case_id == case_id)
        .order_by(CaseArtifact.created_at.desc())
        .all()
    )


# =======================
# CASE ARTIFACTS: GENERATE PDF + SAVE
# =======================
@router.post("/{case_id}/application/pdf")
def generate_application_pdf_for_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    _ensure_case_access(c, current_user)

    benefit = db.query(Benefit).filter(Benefit.id == c.benefit_id).first()
    if not benefit:
        raise HTTPException(status_code=404, detail="Benefit not found")

    prompt = (
        "Сформуй офіційну заяву українською мовою у структурі:\n"
        "[TO]...\n[FROM]...\n[BODY]...\n[ATTACHMENTS]...\n\n"
        f"Заявник: {getattr(current_user, 'full_name', None) or current_user.email}\n"
        f"Email: {current_user.email}\n"
        f"Статус: {current_user.status}\n"
        f"Регіон: {getattr(current_user, 'region', '')}\n\n"
        f"Гарантія: {benefit.title}\n"
        f"Опис: {benefit.description}\n"
        f"Куди звертатись: {benefit.authority}\n"
    )

    text = generate_text(prompt)
    pdf_bytes = application_text_to_pdf_bytes(text, title="ЗАЯВА")

    artifact = CaseArtifact(
        case_id=c.id,
        type="application_pdf",
        title=f"Заява: {benefit.title}",
        content_text=text,
    )
    db.add(artifact)

    db.add(CaseHistory(case_id=c.id, status=c.status, comment="Згенеровано PDF заяви"))
    db.commit()

    filename = f"zayava_case_{case_id}_{date.today().isoformat()}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.get("/{case_id}/progress", response_model=CaseProgressOut)
def get_case_progress(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    _ensure_case_access(c, current_user)

    docs = db.query(CaseDocument).filter(CaseDocument.case_id == case_id).all()

    total = len(docs)
    approved = sum(1 for d in docs if d.status == "approved")
    uploaded = sum(1 for d in docs if d.status == "uploaded")
    rejected = sum(1 for d in docs if d.status == "rejected")
    required = sum(1 for d in docs if d.status == "required")

    percent = int(round((approved / total) * 100)) if total > 0 else 0

    # "готово до подачі" — якщо немає required (все або uploaded/approved/rejected)
    is_ready_to_submit = (required == 0) and (total > 0)

    # "готово до схвалення" — якщо всі approved
    is_ready_for_approval = (approved == total) and (total > 0)

    return CaseProgressOut(
        case_id=case_id,
        total=total,
        approved=approved,
        uploaded=uploaded,
        rejected=rejected,
        required=required,
        percent=percent,
        is_ready_to_submit=is_ready_to_submit,
        is_ready_for_approval=is_ready_for_approval,
    )

# --- решта твого файлу без змін ---
# update_case_document, progress, _recalc_case_status ...
