from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import require_api_access, settings, workflow_engine
from schemas import WorkflowResumeRequest, WorkflowRunRequest, WorkflowSessionResponse

router = APIRouter(prefix=settings.api_prefix, dependencies=[Depends(require_api_access)])


@router.post("/workflows/run", response_model=WorkflowSessionResponse)
async def run_workflow(payload: WorkflowRunRequest) -> WorkflowSessionResponse:
    session = workflow_engine.run(payload.workflow_id, payload.model_dump())
    return WorkflowSessionResponse(**session)


@router.get("/workflows/{session_id}", response_model=WorkflowSessionResponse)
async def get_workflow(session_id: str) -> WorkflowSessionResponse:
    try:
        session = workflow_engine.get(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Workflow session not found.") from exc
    return WorkflowSessionResponse(**session)


@router.post("/workflows/{session_id}/resume", response_model=WorkflowSessionResponse)
async def resume_workflow(session_id: str, payload: WorkflowResumeRequest) -> WorkflowSessionResponse:
    try:
        session = workflow_engine.resume(session_id, payload.overrides)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Workflow session not found.") from exc
    return WorkflowSessionResponse(**session)


@router.post("/workflows/{session_id}/export")
async def export_workflow(session_id: str) -> dict[str, str]:
    try:
        return workflow_engine.export(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Workflow session not found.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
