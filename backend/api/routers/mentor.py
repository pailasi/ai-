from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import require_api_access, research_service, settings
from mentor import get_session, run_mentor_session
from schemas import MentorRunRequest, MentorSessionResponse

router = APIRouter(prefix=settings.api_prefix, dependencies=[Depends(require_api_access)])


@router.post("/mentor/run", response_model=MentorSessionResponse)
async def mentor_run(payload: MentorRunRequest) -> MentorSessionResponse:
    data = run_mentor_session(
        research_service,
        goal=payload.goal,
        topic=payload.topic,
        section=payload.section,
        stage=payload.stage,
        reference_documents=payload.reference_documents,
    )
    return MentorSessionResponse(**data)


@router.get("/mentor/{session_id}", response_model=MentorSessionResponse)
async def mentor_get_session(session_id: str) -> MentorSessionResponse:
    sess = get_session(session_id)
    if sess is None:
        raise HTTPException(status_code=404, detail="Unknown mentor session_id.")
    return MentorSessionResponse(**sess.to_response())
