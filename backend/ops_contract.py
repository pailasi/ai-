from __future__ import annotations


STABILITY_METRIC_DEFINITIONS = {
    "chat_success_rate_7d": "7-day success rate for /api/chat requests.",
    "writing_success_rate_7d": "7-day success rate for /api/writing/help|validate|rewrite requests.",
    "degraded_ratio_7d": "Ratio of responses marked as degraded=true in last 7 days.",
    "top_error_codes_7d": "Top error_code distribution in last 7 days.",
}


STABILITY_GATE_TARGETS = {
    "chat_success_rate_7d": 0.95,
    "writing_success_rate_7d": 0.95,
    "degraded_ratio_7d_max": 0.15,
    "chat_acceptance_pass_rate_min": 0.80,
}


ERROR_CODE_ACTIONS = {
    "MODEL_TIMEOUT": "Retry once, then switch to a lighter model and check network latency.",
    "MODEL_NOT_FOUND": "Verify model name and account entitlement in backend/.env.",
    "TEXT_PROVIDER_UNAVAILABLE": "Check GOOGLE_API_KEY / OPEN_API_KEY and provider permissions.",
    "FIGURE_PROVIDER_UNAVAILABLE": "Check IMG_API_KEY / IMG_BASE_URL / IMG_FIGURE_MODEL, then CODEX or GLM fallback connectivity.",
    "CONFIG_MISSING": "Fill required model keys and model IDs in backend/.env.",
    "NETWORK_ERROR": "Check proxy/firewall and external connectivity for model providers.",
    "RENDERER_UNAVAILABLE": "Install Mermaid CLI (mmdc) or keep using mermaid text fallback.",
    "UNKNOWN_ERROR": "Inspect /api/status.last_error and generation_health for root cause.",
}

