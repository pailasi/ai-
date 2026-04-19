from fastapi import APIRouter, Depends

from api.dependencies import require_api_access, research_service, settings
from schemas import ChatRequest, ChatResponse, DiagramRequest, DiagramResponse, FigureRequest, FigureResponse

router = APIRouter(prefix=settings.api_prefix, dependencies=[Depends(require_api_access)])


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    answer, sources, excerpts, meta = research_service.answer_question(payload.question)
    return ChatResponse(
        answer=answer,
        sources=sources,
        excerpts=excerpts,
        retrieval_source=str(meta.get("retrieval_source", "none")),
        error_code=meta.get("error_code", ""),
        error_hint=meta.get("error_hint", ""),
        retryable=bool(meta.get("retryable", False)),
        degraded=bool(meta.get("degraded", False)),
        model_provider=str(meta.get("model_provider", "")),
        model_name=str(meta.get("model_name", "")),
        fallback_chain=meta.get("fallback_chain", []),
    )


@router.post("/diagram", response_model=DiagramResponse)
async def generate_diagram(payload: DiagramRequest) -> DiagramResponse:
    mermaid_code, image_url, meta = research_service.generate_diagram(
        payload.prompt,
        style=payload.style,
        detail_level=payload.detail_level,
        language=payload.language,
        width=payload.width,
        height=payload.height,
        feedback=payload.feedback,
    )
    return DiagramResponse(
        mermaid_code=mermaid_code,
        image_url=image_url,
        error_code=meta.get("error_code", ""),
        error_hint=meta.get("error_hint", ""),
        retryable=bool(meta.get("retryable", False)),
        degraded=bool(meta.get("degraded", False)),
        model_provider=str(meta.get("model_provider", "")),
        model_name=str(meta.get("model_name", "")),
        fallback_chain=meta.get("fallback_chain", []),
    )


@router.post("/figure", response_model=FigureResponse)
async def generate_figure(payload: FigureRequest) -> FigureResponse:
    result = research_service.generate_figure(
        payload.prompt,
        template_type=payload.template_type,
        style=payload.style,
        detail_level=payload.detail_level,
        language=payload.language,
        width=payload.width,
        height=payload.height,
        feedback=payload.feedback,
    )
    return FigureResponse(**result)


@router.get("/figure/templates")
async def figure_templates() -> dict[str, list[dict[str, str]]]:
    return {"templates": research_service.figure_templates()}
