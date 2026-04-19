import secrets

from dotenv import load_dotenv
from fastapi import Header, HTTPException

from config import PROJECT_ROOT, settings

# Load backend/.env early so os.getenv aliases are available before singleton services initialize.
for env_file in settings.model_config.get("env_file", ()):
    if env_file and load_dotenv(env_file):
        break

from skills import build_default_registry
from services import research_service
from workflows import WorkflowEngine

frontend_dir = PROJECT_ROOT / "frontend"
generated_dir = settings.diagram_dir
workflow_registry = build_default_registry(research_service)
workflow_engine = WorkflowEngine(workflow_registry, settings.data_dir)


def require_api_access(x_api_key: str | None = Header(default=None, alias="X-API-Key")) -> None:
    expected = settings.api_access_key.strip()
    if not expected:
        return
    provided = (x_api_key or "").strip()
    if not provided or not secrets.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail="Missing or invalid API key.")


__all__ = [
    "frontend_dir",
    "generated_dir",
    "require_api_access",
    "research_service",
    "settings",
    "workflow_engine",
    "workflow_registry",
]
