# Sci-Copilot

**Languages:** [简体中文](README.md) | English

Sci-Copilot is a research assistant prototype that combines four practical workflows in one local app:

- Upload PDF papers into a local workspace
- Build a searchable knowledge base from those papers
- Ask grounded questions against indexed content
- Generate Mermaid-based research diagrams, with optional PNG preview

The project now uses a single canonical entrypoint: FastAPI serves both the API and the web UI.
<img width="2560" height="1108" alt="86d8a39a-1500-4ae4-9873-824584029466" src="https://github.com/user-attachments/assets/824d839a-47ec-4eba-a005-65294322784e" />
<img width="2560" height="1108" alt="f1302c93-212c-431d-8212-d38ea7116acc" src="https://github.com/user-attachments/assets/39cca177-5822-415c-bc20-cca73d6b03d6" />

## Current Architecture

- Backend: FastAPI app factory + modular route package (`backend/api`)
- Frontend: static HTML/CSS/JavaScript served by FastAPI
- Retrieval mode: semantic vector retrieval (Chroma) with keyword fallback
- PDF extraction: PyMuPDF
- Text chunking: `langchain-text-splitters`
- Optional diagram rendering: Mermaid CLI (`mmdc`)


## Project Layout

```text
Sci-Copilot/
├─ backend/
│  ├─ api/
│  │  ├─ app.py
│  │  ├─ dependencies.py
│  │  └─ routers/
│  ├─ main.py
│  ├─ config.py
│  ├─ schemas.py
│  ├─ services.py
│  ├─ reasoning/
│  ├─ mentor.py
│  ├─ requirements.txt
│  └─ .env.example
├─ frontend/
│  └─ index.html
├─ docs/
├─ start.bat
├─ start.sh
├─ Dockerfile
├─ docker-compose.yml
├─ README.md
└─ README.en.md
```

Runtime/local-only directories live under `backend/` as needed, including `data/`, `diagrams/`, `chroma_db/`, and local virtual environments. They are not part of the source module layout.


## Quick Start

### Windows

```bat
start.bat
```

### macOS / Linux

```bash
chmod +x start.sh
./start.sh
```

Then open [http://localhost:8000](http://localhost:8000).

## Manual Run

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Windows: copy .env.example .env
python main.py
```

## Environment

1. Copy the template: from `backend/`, run `cp .env.example .env` (Windows: `copy .env.example .env`).  
2. **Treat [`backend/.env.example`](backend/.env.example) as the canonical reference** — it is grouped into sections (minimal setup → each provider → routing → knowledge base) with comments and safe defaults.  
3. Configure **at least one text provider** (`CODEX_API_KEY`, `GOOGLE_API_KEY`, or `OPEN_API_KEY`) for chat, writing, mentor planning, etc. Figure generation uses the separate `IMG_*` / `CODEX_FIGURE_MODEL` / GLM path (see the figure section in the example file).

Default routing (override in `.env`):

- **Text** (`/api/chat`, mentor, rewrite, diagram copy, …): `codex → google → openrouter`  
- **Figures** (`/api/figure`): `img → codex → glm`  

Tuning: `TEXT_PROVIDER_ORDER`, `FIGURE_PROVIDER_ORDER`, `TEXT_MODEL_MAP`, `FIGURE_MODEL_MAP`, `DISABLE_PROVIDERS` (section 7 in `.env.example`).

When upstream models are unavailable, endpoints degrade where supported (explicit errors, Mermaid heuristics, figure placeholders).

If `API_ACCESS_KEY` is set, all `/api/*` routes require `X-API-Key` with the same value.


## API Endpoints

- `GET /`
- `GET /health`
- `GET /api/status`
- `POST /api/documents/upload`
- `POST /api/knowledge/ingest`
- `GET /api/documents`
- `POST /api/chat`
- `POST /api/diagram`
- `POST /api/figure`
- `GET /api/figure/templates`
- `POST /api/writing/help`
- `POST /api/reasoning/method-compare`
- `POST /api/writing/validate`
- `POST /api/writing/rewrite`
- `POST /api/mentor/run`
- `GET /api/mentor/{session_id}`

Interactive docs are available at [http://localhost:8000/docs](http://localhost:8000/docs).

## Generation Parameters (MVP)

`/api/diagram` and `/api/figure` now support optional advanced parameters:

- `style`: `academic` | `minimal` | `presentation`
- `detail_level`: `low` | `medium` | `high`
- `language`: `zh` | `en`
- `width`: optional image width (`512-2400`)
- `height`: optional image height (`512-2400`)
- `feedback`: optional regeneration hint list (`layout` / `elements` / `text` / `style`)

Example:

```json
{
  "prompt": "Draw a paper method pipeline",
  "style": "academic",
  "detail_level": "high",
  "language": "en",
  "width": 1600,
  "height": 900
}
```

If advanced parameters are not provided, existing behavior remains compatible.

Both endpoints now return structured reliability fields:
- `error_code`
- `error_hint`
- `retryable`
- `degraded`
- `model_provider`
- `model_name`
- `fallback_chain`

## Writing Assist and Manuscript Check

### `POST /api/writing/help`

Request:

```json
{
  "topic": "RAG for scientific writing",
  "stage": "draft",
  "question": "How should I organize my method section?",
  "document_scope": []
}
```

Response includes:
- `recommendation`: structured writing direction (MVP template + evidence aware)
- `evidence`: source snippets with trace fields (`source`, `page`, `chunk_id`)
- `draft_template`: reusable paragraph template
- `risk_notes`: writing risks to avoid

### `POST /api/writing/validate`

Request:

```json
{
  "section": "method",
  "text": "Your manuscript paragraph..."
}
```

Response includes:
- `summary`
- `issues[]` with `category`, `severity`, `suggestion`, and `rewrite_example`

### `POST /api/writing/rewrite`

Use this endpoint to rewrite a paragraph with model-driven style polishing and actionable notes.

### Figure Templates

Use `GET /api/figure/templates` to fetch supported template IDs:
- `method_framework`
- `experiment_flow`
- `comparison`
- `ablation`

## AI Mentor (Agent)

**Workspace 08** maps to `POST /api/mentor/run`: you describe a goal in natural language; a text model plans which skills to run, executes them through existing `ResearchService` APIs (retrieval, writing, validation, figures, …), then returns a synthesized review. Planning and synthesis use the same global text stack as chat (`CODEX_API_KEY` / `GOOGLE_API_KEY` / `OPEN_API_KEY`, `TEXT_PROVIDER_ORDER`, `ANALYSIS_MODEL`, … — see `backend/.env.example`).

- `POST /api/mentor/run`: body includes `goal`; optional `topic`, `section`, `stage`, `reference_documents`.  
- `GET /api/mentor/{session_id}`: fetch the same session (in-memory store; use external storage if you run multiple workers).

## Troubleshooting Diagram/Figure Generation

- If PNG preview is missing for diagrams, check whether Mermaid CLI (`mmdc`) is installed.
- If text generation degrades unexpectedly, verify `GOOGLE_API_KEY` / `OPEN_API_KEY` and model names.
- If figure generation fails, verify `GLM_API_KEY`, `FIGURE_MODEL`, and network/proxy settings.
- Check `GET /api/status` for `generation_health.last_generation_error` to inspect latest generation failures.
- `GET /api/status` now includes:
  - `google_api_configured` / `open_api_configured` / `glm_api_configured`
  - `text_primary_provider` / `text_fallback_provider`
  - `retrieval_mode` (`vector_semantic+keyword_fallback` by default)
  - `vector_store_ready` (vector service availability)
  - `knowledge_base_ready` (local indexed content readiness)
  - `last_retrieval_source` (`vector` / `keyword` / `fallback` / `none`)
  - `product_metrics` (chat/writing/diagram/figure request counters)
  - additional debug fields in development when `STATUS_INCLUDE_DEBUG=true`
- Check `error_code` in API response for actionable hints:
  - `MODEL_TIMEOUT`
  - `MODEL_NOT_FOUND`
  - `TEXT_PROVIDER_UNAVAILABLE`
  - `FIGURE_PROVIDER_UNAVAILABLE`
  - `CONFIG_MISSING`
  - `NETWORK_ERROR`
  - `RENDERER_UNAVAILABLE`
  - `INSUFFICIENT_EVIDENCE`

## Acceptance Test Baseline

Use the chat acceptance gate to validate core Q&A quality and reliability contract before release:

```bash
cd backend
python -m unittest test_chat_acceptance.py
```

Modes:
- Default (recommended CI gate): mocked deterministic provider, strict mode on.
- Live check (optional): set `CHAT_ACCEPTANCE_LIVE=1` to hit real provider routes.
- Soft report mode: set `CHAT_ACCEPTANCE_STRICT=0` to print issues without failing.

Example:

```bash
CHAT_ACCEPTANCE_LIVE=1 CHAT_ACCEPTANCE_STRICT=0 python -m unittest test_chat_acceptance.py
```

## Docker

```bash
# Optional: create backend/.env from template for local secrets
cp backend/.env.example backend/.env
docker compose up --build
```

The container exposes the app at [http://localhost:8000](http://localhost:8000).
`docker-compose.yml` now boots with safe defaults, and `.env` remains optional for first run.

## Notes

- Runtime data is intentionally ignored from Git: uploaded PDFs, ChromaDB files, diagrams, and local secrets.
- Mermaid PNG preview requires `mmdc` to be installed on the host or inside your runtime image.
- Vector indexing depends on the embedding model being available to `sentence-transformers`.

## Open-Source Scope

This repository is open-sourced as an actively evolving research-assistant prototype.

- **Supported scope**: local deployment, document ingestion, knowledge retrieval, chat/writing/diagram/figure APIs, Workspace AI mentor (agent orchestration).
- **Out of scope**: production multi-tenant deployment, strict SLA guarantees, managed cloud hosting defaults.
- **Issue reporting**: use GitHub Issues for bugs/feature requests; use private channels described in [`SECURITY.en.md`](SECURITY.en.md) for vulnerabilities.
- **Contribution guide**: see [`CONTRIBUTING.en.md`](CONTRIBUTING.en.md) and [`CODE_OF_CONDUCT.en.md`](CODE_OF_CONDUCT.en.md).

### Known Limitations

- Provider availability depends on third-party API quotas, model permissions, and network/proxy stability.
- Some fallback paths are designed for continuity rather than best-quality generation output.
- Dependency vulnerability remediation is in progress; see `docs/prepublish_security_report.md`.

### Versioning Strategy

- Pre-1.0 releases follow `v0.x.y`.
- `x` increments for feature waves or behavior shifts.
- `y` increments for bug fixes, docs, and non-breaking maintenance.
- Breaking API changes are documented in release notes and should target the next minor line.

## Launch Readiness Checklist

Before public trial release, ensure all items are green:

- Security: no plaintext API keys in repository; debug scripts read env vars only.
- Stability: `test_smoke.py`, `test_mentor.py`, and `test_chat_acceptance.py` pass (or your chosen CI subset).
- Reliability UX: frontend clearly shows `degraded`/`error_hint` for chat/diagram/figure.
- Mentor sessions: `GET /api/mentor/{session_id}` replays stored in-process results (not durable across restarts).
- Deployment: `docker compose up --build` starts app and `/api/status` returns healthy core fields.

## Execution Playbooks

Week-by-week execution assets are tracked in:

- `docs/week1_stability_gates.md`
- `docs/week2_workflow_ux_trace.md`
- `docs/week3_beta_rollout.md`
- `docs/reasoning_toolchain_min_design.md`
- `docs/templates/beta_report_template.md`

## Roadmap Ideas

- Add citations with chunk-level traceability in answers
- Persist chat sessions and research workspaces
- Add ingestion progress and document management UI
- Introduce test automation in CI
