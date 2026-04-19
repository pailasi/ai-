# Week 2 Workflow UX and Traceability

This checklist ensures `needs_revision` workflow behavior is understandable and reproducible.

## Day 6: Status Visibility

- Frontend panels should explicitly show:
  - `degraded`
  - `error_code`
  - `error_hint`
  - `retryable`
- Scope: chat, diagram, and figure sections in `frontend/index.html`.

## Day 7: Revision Flow Reliability

- Validate one full path:
  - `run` -> `needs_revision` -> user revision -> `resume` -> `completed`
- Ensure `pending_action` is clear and actionable.

## Day 8: Export Consistency

- Export bundle should include:
  - paragraph
  - figure caption
  - evidence pack
  - step trace
  - revision history
- Verify all artifacts are aligned for one session.

## Day 9: Explainability Layer

- Keep business answer and system reliability messages visually separated.
- Ensure high-risk workflow blockers are displayed before export attempts.

## Day 10: End-to-End Acceptance

- Complete one manual scenario from question to export.
- Record top 3 blockers and assign owners for Week 3 fixes.
