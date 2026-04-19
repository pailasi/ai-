# Sci-Copilot

**Languages:** [简体中文](README.md) | English

Sci-Copilot is a research assistant prototype that combines four practical workflows in one local app:

- Upload PDF papers into a local workspace
- Build a searchable knowledge base from those papers
- Ask grounded questions against indexed content
- Generate Mermaid-based research diagrams, with optional PNG preview

The project now uses a single canonical entrypoint: FastAPI serves both the API and the web UI.

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
│  ├─ skills/
│  ├─ workflows/
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

Configure `backend/.env` as needed:

```env
APP_ENV=development
HOST=127.0.0.1
PORT=8000
MAX_UPLOAD_SIZE_MB=25
API_ACCESS_KEY=
STATUS_INCLUDE_DEBUG=true

CODEX_API_KEY=
CODEX_BASE_URL=https://api.openai.com/v1
CODEX_TEXT_MODEL=gpt-4.1-mini
CODEX_FIGURE_MODEL=gpt-image-1

IMG_API_KEY=
IMG_BASE_URL=
IMG_FIGURE_MODEL=

GOOGLE_API_KEY=
GOOGLE_MODEL=models/gemma-3-1b-it
ANALYSIS_MODEL=models/gemma-3-1b-it
MENTOR_MODEL=models/gemma-3-1b-it
DIAGRAM_MODEL=models/gemma-3-1b-it

OPEN_API_KEY=
OPEN_MODEL=google/gemini-2.5-flash

TEXT_PROVIDER_ORDER=codex,google,openrouter
FIGURE_PROVIDER_ORDER=img,codex,glm
TEXT_MODEL_MAP={}
FIGURE_MODEL_MAP={}
DISABLE_PROVIDERS=

GLM_API_KEY=
GLM_MODEL=glm-4v-flash
FIGURE_MODEL=cogview-3-plus

ENABLE_VECTOR_STORE=true
EMBEDDINGS_MODEL=all-MiniLM-L6-v2
```

Recommended routing:

- Text tasks (`/api/chat`, mentor dispatch/review, rewrite, diagram text generation): Codex primary when configured, otherwise Google with OpenRouter fallback
- Figure generation (`/api/figure`): IMG primary, then Codex/OpenAI-compatible, then GLM fallback

Global routing policy knobs:

- `TEXT_PROVIDER_ORDER`: comma-separated text provider sequence
- `FIGURE_PROVIDER_ORDER`: comma-separated figure provider sequence
- `TEXT_MODEL_MAP`: JSON provider->model override map
- `FIGURE_MODEL_MAP`: JSON provider->model override map
- `DISABLE_PROVIDERS`: comma-separated provider IDs to temporarily disable

Example:

```env
TEXT_PROVIDER_ORDER=openrouter,google,codex
FIGURE_PROVIDER_ORDER=img,glm,codex
TEXT_MODEL_MAP={"openrouter":"google/gemini-2.5-flash","google":"models/gemma-3-1b-it"}
FIGURE_MODEL_MAP={"img":"gemini-2.5-flash-image-preview","glm":"cogview-3-plus"}
DISABLE_PROVIDERS=codex
```

If the external providers are unavailable, text and figure endpoints still fall back to degraded local behavior where supported:

- Chat returns a clear fallback message
- Diagram generation returns a fallback Mermaid template
- Figure generation returns a fallback SVG/placeholder result when the image provider chain is unavailable

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
- `POST /api/workflows/run`
- `GET /api/workflows/{session_id}`
- `POST /api/workflows/{session_id}/resume`
- `POST /api/workflows/{session_id}/export`

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

## Workflow Mode (Beta)

Sci-Copilot now provides a built-in workflow:
`question_to_submission_paragraph`

This workflow chains:
1. Mentor dispatch (导师AI编排任务)
2. Analysis agent (论文分析与证据提取)
3. Writer agent (段落撰写)
4. Manuscript validation
5. Figure agent (科研配图)
6. Citation agent (证据清单)
7. Mentor review (导师AI最终评审)

Example run request:

```json
{
  "workflow_id": "question_to_submission_paragraph",
  "topic": "RAG for scientific writing",
  "stage": "draft",
  "question": "How should I structure method and experiment sections?",
  "section": "method"
}
```

This orchestration runs automatically after `run`, with no manual step required.
Mentor AI uses an internal prompt-tuned model interface (configure `MENTOR_MODEL` in `backend/.env`; falls back to `ANALYSIS_MODEL`).
Frontend now provides a lightweight entry in the left workspace panel: **自动编排（Beta）** (`一键编排` / `导出编排`).

When workflow status is `needs_revision`, you must revise and re-validate high-risk issues before export.
`POST /api/workflows/{session_id}/resume` accepts:

```json
{
  "overrides": {
    "revised_draft": "your revised paragraph..."
  }
}
```

Export now provides a three-piece package:
- `paragraph_path`
- `figure_caption_path`
- `evidence_path`

Workflow result now also includes:
- `evidence_trace`: source/page/chunk trace list from analysis evidence
- `step_trace`: normalized status of each workflow step
- `revision_history`: revised draft history captured by resume actions

## Mentor-Skill Governance

Workflow orchestration follows a fixed role chain:

1. `mentor_dispatch_skill`: mentor dispatch + execution constraints
2. `analysis_agent_skill`: evidence retrieval and recommendation
3. `writer_agent_skill`: paragraph rewrite
4. `manuscript_validate_skill`: structured risk check
5. `figure_agent_skill`: figure generation (degrade-safe fallback supported)
6. `citation_agent_skill`: citation pack construction
7. `mentor_review_skill`: final mentor review and go-next decision

Quality gates:
- High-risk validation issues force `needs_revision`
- Resume requires revised draft via `POST /api/workflows/{session_id}/resume`
- Export is allowed only when session status is `completed`

Human-in-the-loop:
- When `needs_revision` is returned, revise text first, then resume
- In degraded runs (e.g., model/image fallback), manually review terminology and caption consistency before submission

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
  - `mentor_model` (mentor AI model route)
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

- **Supported scope**: local deployment, document ingestion, knowledge retrieval, chat/writing/diagram/figure APIs, workflow beta path.
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
- Stability: `test_smoke.py`, `test_workflow_engine.py`, and `test_chat_acceptance.py` pass.
- Reliability UX: frontend clearly shows `degraded`/`error_hint` for chat/diagram/figure.
- Workflow traceability: export includes paragraph + figure caption + evidence + step/revision trace.
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
