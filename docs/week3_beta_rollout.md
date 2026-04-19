# Week 3 Beta Rollout Playbook

This playbook covers gray release, issue triage, and reporting.

## Day 11: Release Readiness

- Validate deployment:
  - `docker compose up --build`
  - homepage loads
  - `/api/status` fields are present and valid
- Validate mandatory tests:
  - `test_smoke.py`
  - `test_workflow_engine.py`
  - `test_chat_acceptance.py`

## Day 12: Small-Group Beta

- Invite a fixed pilot group.
- Collect for each failed interaction:
  - input summary
  - endpoint
  - `error_code`
  - `degraded`
  - quick reproduction notes

## Day 13: Failure Review

- Group by root-cause type:
  - retrieval miss
  - provider/auth
  - workflow gate confusion
  - rendering/runtime
- Produce TopN issue list with owner and ETA.

## Day 14: Tool-Reasoning Prep

- Start with one high-value task only:
  - method comparison with evidence checks
- Define required evidence for each claim before output.

## Day 15: Beta Report

- Generate weekly report from `docs/templates/beta_report_template.md`.
- Decide go/no-go for expanding beta users.
