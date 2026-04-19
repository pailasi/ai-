import os

from fastapi import APIRouter, Depends

from api.dependencies import require_api_access, research_service, settings, workflow_engine, workflow_registry
from ops_contract import ERROR_CODE_ACTIONS, STABILITY_GATE_TARGETS, STABILITY_METRIC_DEFINITIONS

router = APIRouter(dependencies=[Depends(require_api_access)])


@router.get("/api/status")
async def api_status() -> dict[str, object]:
    codex_enabled = bool(settings.codex_api_key or os.getenv("GPT_API_KEY", ""))
    img_enabled = bool(settings.img_api_key)
    glm_enabled = bool(settings.glm_api_key)
    figure_provider = "img" if img_enabled else ("codex" if codex_enabled else ("glm" if glm_enabled else "fallback"))
    figure_model = (
        settings.img_figure_model
        if img_enabled
        else (settings.codex_figure_model if codex_enabled else (settings.figure_model or "cogview-3-plus"))
    )
    text_order = list(research_service.text_provider_order)
    figure_order = list(research_service.figure_provider_order)
    text_primary = text_order[0] if text_order else ""
    text_fallback = text_order[1] if len(text_order) > 1 else ""
    payload: dict[str, object] = {
        "codex_api_configured": codex_enabled,
        "img_api_configured": img_enabled,
        "google_api_configured": bool(settings.google_api_key),
        "glm_api_configured": glm_enabled,
        "open_api_configured": bool(settings.open_api_key),
        "text_primary_provider": text_primary,
        "text_fallback_provider": text_fallback,
        "analysis_model": (settings.codex_text_model if codex_enabled else (settings.analysis_model or settings.google_model)),
        "mentor_model": (
            settings.codex_text_model
            if codex_enabled
            else (settings.mentor_model or settings.analysis_model or settings.google_model)
        ),
        "diagram_model": (settings.codex_text_model if codex_enabled else (settings.diagram_model or settings.google_model)),
        "figure_provider": figure_provider,
        "figure_model": figure_model,
        "mermaid_renderer_available": research_service.mmdc_available(),
        "vector_store_ready": research_service.vector_store_available(),
        "knowledge_base_ready": research_service.knowledge_base_ready(),
        "index_state": research_service.index_state(),
        "auto_ingest_on_startup": settings.auto_ingest_on_startup,
        "retrieval_mode": research_service.retrieval_mode(),
        "generation_health": research_service.generation_health(),
        "routing_policy": {
            "text_provider_order": text_order,
            "figure_provider_order": figure_order,
            "disable_providers": sorted(list(research_service.disabled_providers)),
            "text_model_overrides": research_service.text_model_overrides,
            "figure_model_overrides": research_service.figure_model_overrides,
        },
        "last_routing_trace": research_service.last_routing_trace,
    }
    is_local_env = settings.app_env.lower() in {"local", "development"}
    if settings.status_include_debug and is_local_env:
        payload.update(
            {
                "last_retrieval_source": research_service.last_retrieval_source,
                "vector_store_error": research_service.vector_error or "",
                "model_error": research_service.model_error or "",
                "product_metrics": research_service.product_metrics(),
                "last_error": research_service.last_error_payload,
                "stability_metric_definitions": STABILITY_METRIC_DEFINITIONS,
                "stability_gate_targets": STABILITY_GATE_TARGETS,
                "error_code_actions": ERROR_CODE_ACTIONS,
                "skills": workflow_registry.list_skills(),
                "workflow_metrics": workflow_engine.workflow_metrics(),
            }
        )
    return payload
