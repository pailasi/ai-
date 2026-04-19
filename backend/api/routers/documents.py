from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from api.dependencies import require_api_access, research_service, settings
from schemas import DocumentItem, FocusDocumentRequest, FocusDocumentResponse, IngestResponse

router = APIRouter(prefix=settings.api_prefix, dependencies=[Depends(require_api_access)])


@router.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)) -> dict[str, str | bool | int]:
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    content = await file.read()
    max_upload_size_bytes = max(1, settings.max_upload_size_mb) * 1024 * 1024
    if len(content) > max_upload_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the {settings.max_upload_size_mb}MB upload limit.",
        )

    saved_path, replaced = research_service.save_upload(filename, content)
    research_service.schedule_background_ingest()
    return {
        "filename": saved_path.name,
        "message": "File updated." if replaced else "File uploaded.",
        "replaced": replaced,
        "total_pdfs": research_service.count_pdf_files(),
    }


@router.post("/knowledge/ingest", response_model=IngestResponse)
async def ingest_documents() -> IngestResponse:
    indexed_files, chunks = research_service.ingest_all()
    return IngestResponse(
        indexed_files=indexed_files,
        chunks=chunks,
        message=f"Indexed {indexed_files} PDF files into {chunks} chunks.",
    )


@router.get("/documents")
async def list_documents() -> dict[str, object]:
    return {
        "documents": [DocumentItem(**item) for item in research_service.list_documents()],
        "focus_document": research_service.get_focus_document() or "",
    }


@router.post("/documents/focus", response_model=FocusDocumentResponse)
async def set_focus_document(payload: FocusDocumentRequest) -> FocusDocumentResponse:
    try:
        source = research_service.set_focus_document(payload.source)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Document not found.") from exc
    return FocusDocumentResponse(source=source)
