# Week 1 Stability Gates

This checklist is the single execution reference for Week 1.

## Day 1: Metrics Contract

- Use `GET /api/status` as the only source of truth for release metrics.
- Confirm these fields are present:
  - `stability_metric_definitions`
  - `stability_gate_targets`
  - `error_code_actions`
  - `product_metrics`
  - `workflow_metrics`

## Day 2: Provider Routing Regression

- Validate primary/fallback routing from `backend/services.py`.
- Validate error code consistency:
  - `MODEL_TIMEOUT`
  - `MODEL_NOT_FOUND`
  - `TEXT_PROVIDER_UNAVAILABLE`
  - `FIGURE_PROVIDER_UNAVAILABLE`
  - `CONFIG_MISSING`
  - `NETWORK_ERROR`
  - `RENDERER_UNAVAILABLE`

## Day 3: Acceptance Gate

- Run:
  - `python -m unittest test_chat_acceptance.py`
- Default policy:
  - strict mode on
  - mocked deterministic mode
- Optional live verification:
  - `CHAT_ACCEPTANCE_LIVE=1 CHAT_ACCEPTANCE_STRICT=0 python -m unittest test_chat_acceptance.py`

## Day 4: Full Regression

- Run:
  - `python -m unittest test_smoke.py test_workflow_engine.py test_chat_acceptance.py`
- Capture failures into categories:
  - provider/auth
  - retrieval/knowledge
  - workflow gating
  - rendering

## Day 5: Freeze Rules

- Freeze error code semantics for the week.
- Freeze acceptance gate thresholds in `backend/ops_contract.py`.
- Update `README.md` with any changes to release gate policy.
