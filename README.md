# Sci-Copilot

**语言 / Languages：** 简体中文 | [English](README.en.md)

Sci-Copilot 是一款科研助手原型，在单一本地应用中整合四类常用能力：

- 将 PDF 论文上传到本地工作区  
- 基于文献构建可检索的知识库  
- 针对已索引内容提出有依据的问题  
- 生成基于 Mermaid 的研究示意图，并可选用 PNG 预览  

项目采用单一入口：由 FastAPI 同时提供 API 与 Web 前端静态资源。

![](./picture\86d8a39a-1500-4ae4-9873-824584029466.png)
![](./picture\f1302c93-212c-431d-8212-d38ea7116acc.png)

## 当前架构

- 后端：FastAPI 应用工厂 + 模块化路由包（`backend/api`）
- 前端：由 FastAPI 托管的静态 HTML/CSS/JavaScript
- 检索：语义向量检索（Chroma），并有关键词降级
- PDF：`PyMuPDF`
- 分块：`langchain-text-splitters`
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

1. 复制模板：`cd backend` 后执行 `cp .env.example .env`（Windows：`copy .env.example .env`）。  
2. **以 [`backend/.env.example`](backend/.env.example) 为唯一权威说明**：文件内按「最小配置思路 → 各 provider → 路由 → 知识库」分段注释，每个变量一行，含默认值与填写提示。  
3. 至少配置**一条文本模型链路**（`CODEX_API_KEY` 或 `GOOGLE_API_KEY` 或 `OPEN_API_KEY`）才能使用问答、写作、导师规划等在线能力；配图另需 `IMG_*` / `CODEX_FIGURE_MODEL` / `GLM` 等（见示例文件「配图」小节）。

推荐路由（可在 `.env` 中改顺序）：

- **文本**（`/api/chat`、导师、改写、示意图文案等）：默认 `codex → google → openrouter`  
- **配图**（`/api/figure`）：默认 `img → codex → glm`  

路由与模型覆盖：`TEXT_PROVIDER_ORDER`、`FIGURE_PROVIDER_ORDER`、`TEXT_MODEL_MAP`、`FIGURE_MODEL_MAP`、`DISABLE_PROVIDERS`（详见 `.env.example` 第 7 节）。

外部模型不可用时，文本与配图接口在支持的前提下仍会降级（降级说明、Mermaid 兜底、配图占位等）。

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
- `POST /api/mentor/run`
- `GET /api/mentor/{session_id}`

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

## AI 导师（Agent）

前端 **Workspace 08 · AI导师** 对应接口 `POST /api/mentor/run`：提交自然语言目标后，由文本模型规划 skill 顺序，逐步调用现有 `ResearchService` 能力（检索、写作、校验、配图等），最后返回总评。规划与总结使用的模型与全局文本链路一致（`CODEX_API_KEY` / `GOOGLE_API_KEY` / `OPEN_API_KEY` 及 `TEXT_PROVIDER_ORDER`、`ANALYSIS_MODEL` 等，见 `backend/.env.example`）。

- `POST /api/mentor/run`：请求体含 `goal`，可选 `topic`、`section`、`stage`、`reference_documents`。  
- `GET /api/mentor/{session_id}`：查询同一会话结果（进程内存储，多 worker 部署需自行换持久化方案）。

## 示意图 / 配图故障排查

- PNG 预览缺失：检查是否安装 Mermaid CLI（`mmdc`）。
- 文本异常降级：核对 `GOOGLE_API_KEY`、`OPEN_API_KEY` 及模型名。
- 配图失败：核对 `GLM_API_KEY`、`FIGURE_MODEL`、网络与代理。
- `GET /api/status` 中 `generation_health.last_generation_error` 可看最近一次生成错误。
- `GET /api/status` 还包含：`google_api_configured`、`open_api_configured`、`glm_api_configured`、`text_primary_provider`、`text_fallback_provider`、`retrieval_mode`、`vector_store_ready`、`knowledge_base_ready`、`last_retrieval_source`、`product_metrics` 等（开发环境下字段更全，见接口返回）。
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

- **涵盖**：本地部署、文档入库与检索、对话/写作/示意图/配图 API、Workspace AI 导师（Agent 编排）。
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
- 稳定：`test_smoke.py`、`test_mentor.py`、`test_chat_acceptance.py` 通过（或 CI 自选子集）。
- 可靠性体验：前端对对话/示意图/配图展示 `degraded`/`error_hint`。
- 导师会话：`GET /api/mentor/{session_id}` 可回放进程内保存的结果（重启后不保留）。
- 部署：`docker compose up --build` 可启动且 `/api/status` 核心字段正常。

## 执行类文档

周计划与模板见：`docs/week1_stability_gates.md`、`docs/week2_workflow_ux_trace.md`、`docs/week3_beta_rollout.md`、`docs/reasoning_toolchain_min_design.md`、`docs/templates/beta_report_template.md`。

## 路线图设想

- 答案中引入 chunk 级可追溯引用  
- 持久化对话会话与研究空间  
- 入库进度与文档管理 UI  
- CI 测试自动化  
