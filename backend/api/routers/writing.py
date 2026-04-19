from fastapi import APIRouter, Depends

from api.dependencies import require_api_access, research_service, settings
from schemas import (
    MethodCompareRequest,
    MethodCompareResponse,
    WritingHelpRequest,
    WritingHelpResponse,
    WritingRewriteRequest,
    WritingRewriteResponse,
    WritingValidateRequest,
    WritingValidateResponse,
)

router = APIRouter(prefix=settings.api_prefix, dependencies=[Depends(require_api_access)])


def _reference_list_writing(payload: WritingHelpRequest) -> list[str]:
    return list(payload.reference_documents or payload.document_scope or [])


def _reference_list_compare(payload: MethodCompareRequest) -> list[str]:
    return list(payload.reference_documents or payload.document_scope or [])


@router.post("/writing/help", response_model=WritingHelpResponse)
async def writing_help(payload: WritingHelpRequest) -> WritingHelpResponse:
    result = research_service.writing_help(
        topic=payload.topic,
        stage=payload.stage,
        question=payload.question,
        reference_documents=_reference_list_writing(payload),
        manuscript_source=payload.manuscript_source,
    )
    return WritingHelpResponse(**result)


@router.post("/reasoning/method-compare", response_model=MethodCompareResponse)
async def method_compare(payload: MethodCompareRequest) -> MethodCompareResponse:
    result = research_service.compare_methods(
        question=payload.question,
        method_a=payload.method_a,
        method_b=payload.method_b,
        reference_documents=_reference_list_compare(payload),
    )
    return MethodCompareResponse(**result)


@router.post("/writing/validate", response_model=WritingValidateResponse)
async def writing_validate(payload: WritingValidateRequest) -> WritingValidateResponse:
    section = payload.section
    if not section:
        section = research_service.map_validate_scope_to_rule_section(payload.validate_scope)
    result = research_service.validate_manuscript(
        validate_scope=payload.validate_scope,
        section=section,
        text=payload.text,
        reference_documents=payload.reference_documents,
        use_llm_review=payload.use_llm_review,
    )
    return WritingValidateResponse(**result)


@router.post("/writing/rewrite", response_model=WritingRewriteResponse)
async def writing_rewrite(payload: WritingRewriteRequest) -> WritingRewriteResponse:
    result = research_service.rewrite_paragraph(section=payload.section, text=payload.text, focus=payload.focus)
    return WritingRewriteResponse(**result)
