from fastapi import APIRouter
from fastapi.responses import FileResponse

from api.dependencies import frontend_dir

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/")
async def index() -> FileResponse:
    return FileResponse(frontend_dir / "index.html")
