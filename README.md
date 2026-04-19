# Sci-Copilot

**语言 / Languages：** 简体中文 | [English](README.en.md)

Sci-Copilot 是一款科研助手原型，在单一本地应用中整合四类常用能力：

- 将 PDF 论文上传到本地工作区  
- 基于文献构建可检索的知识库  
- 针对已索引内容提出有依据的问题  
- 生成基于 Mermaid 的研究示意图，并可选用 PNG 预览  

项目采用单一入口：由 FastAPI 同时提供 API 与 Web 前端静态资源。

## 当前架构

- 后端：FastAPI 应用工厂 + 模块化路由包（`backend/api`）
- 前端：由 FastAPI 托管的静态 HTML/CSS/JavaScript
- 检索：语义向量检索（Chroma），并有关键词降级
- PDF：`PyMuPDF`
- 分块：`langchain-text-splitters`
- 文本模型：Codex（OpenAI 兼容）、Google GenAI、OpenRouter 降级
- 配图模型：IMG 优先，其次 Codex（OpenAI 兼容），再次 GLM 降级
- 图示渲染（可选）：Mermaid CLI（`mmdc`）

## 项目目录

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
│  ├─ index.html
│  └─ newindex.html
├─ docs/
├─ start.bat
├─ start.sh
├─ Dockerfile
├─ docker-compose.yml
├─ README.md
└─ README.en.md
```

运行时或仅本地的目录按需出现在 `backend/` 下，例如 `data/`、`diagrams/`、`chroma_db/`、本地虚拟环境；它们不属于源码模块树的一部分。

## 快速开始

### Windows

```bat
start.bat
```

### macOS / Linux

```bash
chmod +x start.sh
./start.sh
```

然后在浏览器打开 [http://localhost:8000](http://localhost:8000)。

## 手动运行

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Windows: copy .env.example .env
python main.py
```

## 环境变量

按需配置 `backend/.env`：

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

推荐路由策略：

- 文本类（`/api/chat`、导师编排与评审、改写、示意图文案等）：已配置 Codex 时优先 Codex，否则 Google，再 OpenRouter 降级  
- 配图（`/api/figure`）：IMG 优先，其次 Codex（OpenAI 兼容），再 GLM  

全局可调参数：

- `TEXT_PROVIDER_ORDER`：文本提供方顺序（逗号分隔）
- `FIGURE_PROVIDER_ORDER`：配图提供方顺序（逗号分隔）
- `TEXT_MODEL_MAP`：JSON，`provider -> model` 覆盖
- `FIGURE_MODEL_MAP`：JSON，`provider -> model` 覆盖
- `DISABLE_PROVIDERS`：暂时禁用的 provider ID（逗号分隔）

示例：

```env
TEXT_PROVIDER_ORDER=openrouter,google,codex
FIGURE_PROVIDER_ORDER=img,glm,codex
TEXT_MODEL_MAP={"openrouter":"google/gemini-2.5-flash","google":"models/gemma-3-1b-it"}
FIGURE_MODEL_MAP={"img":"gemini-2.5-flash-image-preview","glm":"cogview-3-plus"}
DISABLE_PROVIDERS=codex
```

外部模型不可用时，文本与配图接口在支持的前提下仍会降级：

- 对话返回明确的降级说明  
- 示意图生成返回备用 Mermaid 模板  
- 配图在整条链路失败时返回备用 SVG/占位结果  

若设置了 `API_ACCESS_KEY`，所有 `/api/*` 须在请求头携带 `X-API-Key`，值与之相同。

## API 端点

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

交互式文档：[http://localhost:8000/docs](http://localhost:8000/docs)。

## 生成参数（MVP）

`/api/diagram` 与 `/api/figure` 支持可选进阶参数：

- `style`：`academic` | `minimal` | `presentation`
- `detail_level`：`low` | `medium` | `high`
- `language`：`zh` | `en`
- `width`：图片宽度（`512–2400`）
- `height`：图片高度（`512–2400`）
- `feedback`：再次生成时的提示维度（`layout` / `elements` / `text` / `style`）

示例：

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

未提供进阶参数时行为与先前版本兼容。

两接口响应均包含结构化可靠性字段：

- `error_code`、`error_hint`、`retryable`、`degraded`
- `model_provider`、`model_name`、`fallback_chain`

## 写作辅助与稿件校验

### `POST /api/writing/help`

请求示例：

```json
{
  "topic": "RAG for scientific writing",
  "stage": "draft",
  "question": "How should I organize my method section?",
  "document_scope": []
}
```

响应包含：`recommendation`（写作方向）、带溯源的 `evidence`（`source`、`page`、`chunk_id`）、`draft_template`、`risk_notes`。

### `POST /api/writing/validate`

请求示例：

```json
{
  "section": "method",
  "text": "Your manuscript paragraph..."
}
```

响应包含：`summary`，以及 `issues[]`（`category`、`severity`、`suggestion`、`rewrite_example`）。

### `POST /api/writing/rewrite`

用于段落润色改写，并附带可操作的修改说明。

### 配图模板

`GET /api/figure/templates` 获取模板 ID，例如：`method_framework`、`experiment_flow`、`comparison`、`ablation`。

## 工作流模式（Beta）

内置工作流 ID：`question_to_submission_paragraph`。步骤包括：

1. 导师编排（导师 AI 编排任务）
2. 分析智能体（论文分析与证据提取）
3. 撰稿智能体（段落撰写）
4. 稿件校验
5. 配图智能体（科研配图）
6. 引用智能体（证据清单）
7. 导师终审（导师 AI 最终评审）

触发示例：

```json
{
  "workflow_id": "question_to_submission_paragraph",
  "topic": "RAG for scientific writing",
  "stage": "draft",
  "question": "How should I structure method and experiment sections?",
  "section": "method"
}
```

`run` 之后编排自动执行，无需手动逐步点击。导师模型在 `backend/.env` 中配置 `MENTOR_MODEL`，缺省回落到 `ANALYSIS_MODEL`。前端左侧工作区提供轻量入口：**自动编排（Beta）**（一键编排 / 导出编排）。

状态为 `needs_revision` 时，需修改正文并消除高风险校验项后再导出。`POST /api/workflows/{session_id}/resume` 示例：

```json
{
  "overrides": {
    "revised_draft": "your revised paragraph..."
  }
}
```

导出为三件套路径：`paragraph_path`、`figure_caption_path`、`evidence_path`。结果中还包含：`evidence_trace`、`step_trace`、`revision_history`。

## Mentor-Skill 编排约定

固定技能链：`mentor_dispatch_skill` → `analysis_agent_skill` → `writer_agent_skill` → `manuscript_validate_skill` → `figure_agent_skill` → `citation_agent_skill` → `mentor_review_skill`。

质量门禁：高风险校验问题会导致 `needs_revision`；必须通过 `resume` 提交修订稿；仅当会话状态为 `completed` 时才允许导出。人机协同：降级运行（模型/配图回退）时请在提交前人工核对术语与配图说明一致性。

## 示意图 / 配图故障排查

- PNG 预览缺失：检查是否安装 Mermaid CLI（`mmdc`）。
- 文本异常降级：核对 `GOOGLE_API_KEY`、`OPEN_API_KEY` 及模型名。
- 配图失败：核对 `GLM_API_KEY`、`FIGURE_MODEL`、网络与代理。
- `GET /api/status` 中 `generation_health.last_generation_error` 可看最近一次生成错误。
- `GET /api/status` 还包含：`google_api_configured`、`open_api_configured`、`glm_api_configured`、`text_primary_provider`、`text_fallback_provider`、`retrieval_mode`、`vector_store_ready`、`knowledge_base_ready`、`last_retrieval_source`、`product_metrics`、`mentor_model`。
- 响应中的 `error_code` 可作定位参考：`MODEL_TIMEOUT`、`MODEL_NOT_FOUND`、`TEXT_PROVIDER_UNAVAILABLE`、`FIGURE_PROVIDER_UNAVAILABLE`、`CONFIG_MISSING`、`NETWORK_ERROR`、`RENDERER_UNAVAILABLE`、`INSUFFICIENT_EVIDENCE`。

## 验收测试基线

发布前可用对话验收保障核心问答质量：

```bash
cd backend
python -m unittest test_chat_acceptance.py
```

模式说明：

- 默认（推荐 CI）：确定性 mock、严格模式。
- 联机可选：设置 `CHAT_ACCEPTANCE_LIVE=1`。
- 软报告：设置 `CHAT_ACCEPTANCE_STRICT=0`，仅打印问题不失败。

示例：

```bash
CHAT_ACCEPTANCE_LIVE=1 CHAT_ACCEPTANCE_STRICT=0 python -m unittest test_chat_acceptance.py
```

## Docker

```bash
cp backend/.env.example backend/.env   # 可选：本地密钥
docker compose up --build
```

容器对外 [http://localhost:8000](http://localhost:8000)。`docker-compose.yml` 具备安全默认配置；首次运行可不强制 `.env`。

## 说明

- PDF、ChromaDB、示意图与密钥等运行时数据不入库。
- Mermaid PNG 预览依赖主机或镜像内安装的 `mmdc`。
- 向量索引依赖 `sentence-transformers` 可用的嵌入模型。

## 开源范围

本仓库作为持续演进的科研助手原型开源。

- **涵盖**：本地部署、文档入库与检索、对话/写作/示意图/配图 API、Beta 工作流路径。
- **不涵盖**：生产级多租户、严格 SLA、默认托管云形态。
- **缺陷与需求**：GitHub Issues；**安全漏洞**：按 [`SECURITY.md`](SECURITY.md) 私密渠道报告。
- **贡献与社区准则**：见 [`CONTRIBUTING.md`](CONTRIBUTING.md) 与 [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)。

### 已知局限

- 第三方 API 配额、模型权限与网络稳定性会影响可用性。
- 部分降级路径优先考虑不断服，而非最优生成质量。
- 依赖漏洞治理进行中，参见 `docs/prepublish_security_report.md`。

### 版本策略

- 1.0 之前采用 `v0.x.y`。
- `x`：功能里程碑或行为变更。
- `y`：修复、文档与非破坏性维护。
- 破坏性 API 变更记入发布说明并尽量落在下一个次版本线。

## 上线前自检

- 安全：仓库无明文密钥；调试脚本仅读环境变量。
- 稳定：`test_smoke.py`、`test_workflow_engine.py`、`test_chat_acceptance.py` 通过。
- 可靠性体验：前端对对话/示意图/配图展示 `degraded`/`error_hint`。
- 工作流可追溯：导出包含段落、配图说明、证据与步骤/修订痕迹。
- 部署：`docker compose up --build` 可启动且 `/api/status` 核心字段正常。

## 执行类文档

周计划与模板见：`docs/week1_stability_gates.md`、`docs/week2_workflow_ux_trace.md`、`docs/week3_beta_rollout.md`、`docs/reasoning_toolchain_min_design.md`、`docs/templates/beta_report_template.md`。

## 路线图设想

- 答案中引入 chunk 级可追溯引用  
- 持久化对话会话与研究空间  
- 入库进度与文档管理 UI  
- CI 测试自动化  
