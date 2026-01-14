from io import BytesIO
from datetime import date, datetime
from pathlib import Path
import mimetypes
import shutil

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db

from app.models.user import User
from app.models.benefit import Benefit
from app.models.case import Case
from app.models.case_document import CaseDocument
from app.models.case_history import CaseHistory
from app.models.case_artifact import CaseArtifact

from app.schemas.case import CaseCreate, CaseOut, CaseUpdate
from app.schemas.case_ai import CaseAskRequest, CaseAskResponse
from app.schemas.case_artifact import CaseArtifactOut
from app.schemas.case_document import (
    CaseDocumentOut,
    CaseDocumentUpdate,
    ALLOWED_DOC_STATUSES,
)
from app.schemas.case_progress import CaseProgressOut

from app.services.ai_client import generate_text
from app.services.pdf_service import application_text_to_pdf_bytes

router = APIRouter(prefix="/cases", tags=["cases"])

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
}

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}

def _get_extension(filename: str) -> str:
    return Path(filename or "").suffix.lower()


def _validate_upload_file(file: UploadFile) -> None:
    filename = file.filename or ""
    ext = _get_extension(filename)

    # 1) extension
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Недопустиме розширення файлу ({ext}). Дозволено: pdf, jpg, jpeg, png",
        )

    # 2) mime-type
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Недопустимий тип файлу ({content_type}). Дозволено: PDF/JPEG/PNG",
        )


def _validate_magic_bytes(ext: str, first_bytes: bytes) -> None:
    # мінімальна перевірка сигнатур (щоб не підсунули підробку)
    if ext == ".pdf":
        if not first_bytes.startswith(b"%PDF"):
            raise HTTPException(status_code=400, detail="Файл не схожий на валідний PDF")
    elif ext in {".jpg", ".jpeg"}:
        # JPEG починається з FF D8 FF
        if len(first_bytes) < 3 or first_bytes[:3] != b"\xFF\xD8\xFF":
            raise HTTPException(status_code=400, detail="Файл не схожий на валідний JPEG")
    elif ext == ".png":
        # PNG сигнатура: 89 50 4E 47 0D 0A 1A 0A
        if len(first_bytes) < 8 or first_bytes[:8] != b"\x89PNG\r\n\x1a\n":
            raise HTTPException(status_code=400, detail="Файл не схожий на валідний PNG")


def _safe_filename(name: str) -> str:
    name = (name or "").strip()
    name = name.replace("\\", "_").replace("/", "_")
    return name[:200] if name else "file"


def _ensure_case_access(c: Case, current_user: User) -> None:
    if c.user_id != current_user.id and getattr(current_user, "role", None) != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")


def _recalc_case_status(db: Session, case_id: int) -> str:
    docs = db.query(CaseDocument).filter(CaseDocument.case_id == case_id).all()
    total = len(docs)
    if total == 0:
        return "draft"

    required = sum(1 for d in docs if d.status == "required")
    rejected = sum(1 for d in docs if d.status == "rejected")
    approved = sum(1 for d in docs if d.status == "approved")

    if approved == total:
        return "done"
    if rejected > 0:
        return "in_review"
    if required == 0:
        return "submitted"
    return "draft"


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

    title = (getattr(data, "title", None) or "").strip()
    description = (getattr(data, "description", None) or "").strip()
    note = (getattr(data, "note", None) or "").strip()

    if not title:
        title = "Без назви"

    c = Case(
        user_id=current_user.id,
        benefit_id=data.benefit_id,
        status="draft",
        title=title,
        description=description,
        note=note,
    )

    db.add(c)
    db.flush()
    db.refresh(c)

    docs = [x.strip() for x in (benefit.required_documents or "").split("\n") if x.strip()]
    for t in docs:
        db.add(CaseDocument(case_id=c.id, title=t, status="required"))

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
    if getattr(current_user, "role", None) != "admin":
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

    if getattr(data, "title", None) is not None:
        c.title = (data.title or "").strip()
    if getattr(data, "description", None) is not None:
        c.description = (data.description or "").strip()

    if getattr(data, "note", None) is not None:
        c.note = data.note or ""

    db.add(CaseHistory(case_id=c.id, status=c.status, comment="Оновлення справи"))
    db.commit()
    db.refresh(c)
    return c


# =======================
# CASE DOCUMENTS (LIST)
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

    docs = (
        db.query(CaseDocument)
        .filter(CaseDocument.case_id == case_id)
        .order_by(CaseDocument.id)
        .all()
    )

    # ✅ якщо в схемі comment: str (не optional) — прибираємо 500
    for d in docs:
        if getattr(d, "comment", None) is None:
            d.comment = ""  # type: ignore[attr-defined]

    return docs


# =======================
# CASE DOCUMENTS (UPDATE) ✅ PATCH /cases/{case_id}/documents/{doc_id}
# =======================
@router.patch("/{case_id}/documents/{doc_id}", response_model=CaseDocumentOut)
def update_case_document(
    case_id: int,
    doc_id: int,
    data: CaseDocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    _ensure_case_access(c, current_user)

    d = (
        db.query(CaseDocument)
        .filter(CaseDocument.id == doc_id, CaseDocument.case_id == case_id)
        .first()
    )
    if not d:
        raise HTTPException(status_code=404, detail="Document not found")

    if data.status is not None:
        if data.status not in ALLOWED_DOC_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")
        d.status = data.status

    if getattr(data, "comment", None) is not None:
        d.comment = data.comment

    db.add(
        CaseHistory(
            case_id=case_id,
            status=c.status,
            comment=f"Оновлено документ: {d.title} → {d.status}",
        )
    )

    new_status = _recalc_case_status(db, case_id)
    if c.status != new_status:
        c.status = new_status
        db.add(
            CaseHistory(
                case_id=case_id,
                status=new_status,
                comment=f"[AUTO] Статус справи оновлено автоматично → {new_status}",
            )
        )

    db.commit()
    db.refresh(d)

    if getattr(d, "comment", None) is None:
        d.comment = ""  # type: ignore[attr-defined]

    return d


# =======================
# CASE DOCUMENTS (UPLOAD FILE) ✅ POST /cases/{case_id}/documents/{doc_id}/upload
# =======================
@router.post("/{case_id}/documents/{doc_id}/upload", response_model=CaseDocumentOut)
def upload_case_document(
    case_id: int,
    doc_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    _ensure_case_access(c, current_user)

    d = (
        db.query(CaseDocument)
        .filter(CaseDocument.id == doc_id, CaseDocument.case_id == case_id)
        .first()
    )
    if not d:
        raise HTTPException(status_code=404, detail="Document not found")

    # ✅ validation: ext + content-type
    _validate_upload_file(file)
    ext = _get_extension(file.filename or "")

    case_dir = UPLOADS_DIR / f"case_{case_id}"
    case_dir.mkdir(parents=True, exist_ok=True)

    safe_original = _safe_filename(file.filename or f"document{ext}")
    stored_name = f"doc_{doc_id}_{int(datetime.utcnow().timestamp())}_{safe_original}"
    file_path = case_dir / stored_name

    # ✅ stream save with size limit + magic bytes
    size = 0
    first_chunk = b""

    try:
        with file_path.open("wb") as buffer:
            while True:
                chunk = file.file.read(1024 * 1024)  # 1MB
                if not chunk:
                    break

                if not first_chunk:
                    first_chunk = chunk[:16]  # enough for signature checks

                size += len(chunk)
                if size > MAX_UPLOAD_SIZE_BYTES:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Файл занадто великий. Максимум {MAX_UPLOAD_SIZE_BYTES // (1024*1024)} MB",
                    )

                buffer.write(chunk)

        # сигнатура (магічні байти)
        _validate_magic_bytes(ext, first_chunk)

    except HTTPException:
        # якщо зловили валідацію — прибрати частково записаний файл
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception:
                pass
        raise

    # ✅ update db (обережно з полями, якщо їх нема у твоїй БД)
    d.file_name = file.filename
    d.file_path = str(file_path)

    # якщо у БД немає content_type/size_bytes — прибери ці 2 рядки
    if hasattr(d, "content_type"):
        d.content_type = file.content_type
    if hasattr(d, "size_bytes"):
        d.size_bytes = size

    d.status = "uploaded"

    db.add(
        CaseHistory(
            case_id=case_id,
            status=c.status,
            comment=f"Завантажено файл для документа: {d.title}",
        )
    )

    new_status = _recalc_case_status(db, case_id)
    if c.status != new_status:
        c.status = new_status
        db.add(
            CaseHistory(
                case_id=case_id,
                status=new_status,
                comment=f"[AUTO] Статус справи → {new_status}",
            )
        )

    db.commit()
    db.refresh(d)
    return d


# =======================
# CASE DOCUMENTS (DOWNLOAD FILE) ✅ GET /cases/{case_id}/documents/{doc_id}/download
# =======================
@router.get("/{case_id}/documents/{doc_id}/download")
def download_case_document(
    case_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    _ensure_case_access(c, current_user)

    d = (
        db.query(CaseDocument)
        .filter(CaseDocument.id == doc_id, CaseDocument.case_id == case_id)
        .first()
    )
    if not d:
        raise HTTPException(status_code=404, detail="Document not found")

    if not getattr(d, "file_path", None):
        raise HTTPException(status_code=404, detail="File not uploaded")

    path = Path(d.file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File missing on server")

    media_type = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    filename = getattr(d, "file_name", None) or path.name

    return FileResponse(
        path=str(path),
        media_type=media_type,
        filename=filename,
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
# CASE PROGRESS
# =======================
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

    is_ready_to_submit = (required == 0) and (total > 0)
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
        f"Користувач:\n- Статус: {getattr(current_user, 'status', '')}\n\n"
        f"Справa:\n- ID: {c.id}\n- Статус: {c.status}\n"
        f"- Назва: {getattr(c, 'title', '')}\n"
        f"- Опис: {getattr(c, 'description', '')}\n"
        f"- Примітка: {getattr(c, 'note', '')}\n\n"
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
        f"Статус: {getattr(current_user, 'status', '')}\n"
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
