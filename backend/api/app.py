from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.dependencies import generated_dir, research_service, settings
from api.routers.assistant import router as assistant_router
from api.routers.core import router as core_router
from api.routers.documents import router as documents_router
from api.routers.status import router as status_router
from api.routers.workflows import router as workflows_router
from api.routers.writing import router as writing_router


@asynccontextmanager
async def _lifespan(app: FastAPI):
    if settings.auto_ingest_on_startup:
        research_service.schedule_background_ingest()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Sci-Copilot",
        version="1.1.0",
        description="Research workspace for PDF ingestion, grounded Q&A, flow diagrams, and paper-ready figures.",
        lifespan=_lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    if generated_dir.exists():
        app.mount("/generated", StaticFiles(directory=generated_dir), name="generated")

    app.include_router(core_router)
    app.include_router(documents_router)
    app.include_router(assistant_router)
    app.include_router(writing_router)
    app.include_router(workflows_router)
    app.include_router(status_router)
    return app
