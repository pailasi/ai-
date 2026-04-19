# Contributing to Sci-Copilot

Thanks for your interest in contributing.

## Getting Started

1. Fork the repository and create a feature branch from `main`.
2. Set up the backend locally:
   - `cd backend`
   - `python -m venv venv`
   - Activate virtual environment
   - `pip install -r requirements.txt`
3. Create local config:
   - `copy .env.example .env` (Windows)
   - `cp .env.example .env` (macOS/Linux)
4. Start app with `python main.py`, then open `http://localhost:8000`.

## Development Rules

- Keep changes focused and small.
- Do not commit secrets (`.env`, keys, credentials, personal tokens).
- Add or update tests when behavior changes.
- Keep API contracts backward compatible unless clearly documented.

## Test Expectations

Run these checks before opening a PR:

- `cd backend`
- `python -m unittest test_smoke.py`
- `python -m unittest test_workflow_engine.py`

If your change touches a specific area, run the related test modules too.

## Pull Request Checklist

- Explain the user-facing problem and why the change is needed.
- Include implementation notes and risk areas.
- Mention test coverage and exact commands used.
- Update docs (`README.md` / `PROJECT_OVERVIEW.md`) when behavior or config changes.

## Commit Style (Recommended)

Use clear, intent-focused messages, for example:

- `fix: keep chat retrieval scoped to focused paper`
- `docs: clarify image provider routing and fallback behavior`
- `test: add regression case for ingestion status sync`

## Reporting Issues

When opening issues, include:

- Reproduction steps
- Expected vs. actual behavior
- Logs or API response payload (redact private data)
- Environment info (OS, Python version, provider mode)
