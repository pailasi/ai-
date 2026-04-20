# 项目概览

## 当前定位

Sci-Copilot 是一个本地科研助手原型，采用 FastAPI 单入口提供 API 与前端页面，主流程为：

1. 上传 PDF
2. 构建本地索引
3. 基于命中文献片段问答
4. 生成 Mermaid 流程图与论文配图预览

## 当前架构

- 后端：FastAPI（`backend/main.py`）
- 前端：静态页面（`frontend/index.html`），由后端托管
- 文献解析：PyMuPDF
- 切分：`langchain-text-splitters`
- 生成模型：Google GenAI（可选）/ GLM（可选）
- 图渲染：Mermaid CLI（可选）

### AI 导师（Agent）

- 入口：`POST /api/mentor/run`（自然语言目标 → LLM 规划 skill 顺序 → 调用 `ResearchService` → 总评）
- 查询：`GET /api/mentor/{session_id}`（进程内会话，多实例部署需自行持久化）
- 配置：与全局文本模型链路相同，见 `backend/.env.example`

## 实际 API（与代码一致）

- `GET /`
- `GET /health`
- `GET /api/status`
- `GET /api/documents`
- `POST /api/documents/upload`
- `POST /api/knowledge/ingest`
- `POST /api/chat`
- `POST /api/reasoning/method-compare`
- `POST /api/diagram`
- `POST /api/figure`
- `GET /api/figure/templates`
- `POST /api/writing/help`
- `POST /api/writing/validate`
- `POST /api/writing/rewrite`
- `POST /api/mentor/run`
- `GET /api/mentor/{session_id}`

## 关键文件

- `backend/main.py`：API 入口与路由
- `backend/services.py`：业务逻辑（文献索引、问答、出图）
- `backend/reasoning/contracts.py`：工具化推理链路输入输出契约
- `backend/schemas.py`：请求/响应模型
- `backend/config.py`：配置管理
- `backend/mentor.py`：AI 导师 Agent 编排
- `frontend/index.html`：前端工作台
- `start.sh` / `start.bat`：本地一键启动
- `Dockerfile` / `docker-compose.yml`：容器化部署

## 运行说明

1. 复制 `backend/.env.example` 为 `backend/.env`
2. 打开 `backend/.env`，至少配置一条**文本**模型链路（`CODEX_API_KEY` 或 `GOOGLE_API_KEY` 或 `OPEN_API_KEY`）；配图再按需配置 `IMG_*` / `CODEX_FIGURE_MODEL` / `GLM_*`（详见 `.env.example` 内注释）
3. 执行 `start.bat`（Windows）或 `./start.sh`（macOS/Linux）
4. 打开 `http://localhost:8000`

补充运行约束：
- 可通过 `MAX_UPLOAD_SIZE_MB` 限制单文件上传大小（默认 25MB）
- 若配置 `API_ACCESS_KEY`，所有 `/api/*` 请求需携带 `X-API-Key`
- 生产环境建议将 `STATUS_INCLUDE_DEBUG=false` 以减少状态接口暴露字段
- 可通过 `TEXT_PROVIDER_ORDER` / `FIGURE_PROVIDER_ORDER` 控制全局模型路由顺序
- 可通过 `TEXT_MODEL_MAP` / `FIGURE_MODEL_MAP` 覆盖 provider 默认模型
- 可通过 `DISABLE_PROVIDERS` 临时熔断指定 provider（逗号分隔）

## 现阶段边界

- 当前以本地单机使用为主，尚未引入用户系统与多租户隔离
- 向量检索为轻量本地索引策略，适合原型验证与小规模文献集
- 测试与 CI 能力仍在建设中（已覆盖 smoke、mentor、对话验收等基础单测）

## 当前上线准备状态（Beta）

- 稳定性：文本模型路由已统一为主备链路，错误码与降级提示已结构化。
- 质量门禁：新增 `backend/test_chat_acceptance.py`，支持严格门禁与可选 live 验收。
- 运行口径：`/api/status` 提供稳定性指标定义、门槛目标和错误码动作映射（由后端统一输出）。
- 可解释性：前端已显式展示 `degraded` / `error_code` / `error_hint`，避免误判结果可信度。
- 可追溯性：写作/方法对比等接口在响应中带证据与来源字段；导师返回 `plan`/`steps`/`summary`。
- 待补强：多用户隔离、线上监控告警、以及更大规模题集评测仍需继续建设。

## 会话与导出

- 导师会话 `session_id` 仅存于当前进程内存，重启后丢失；生产多 worker 需外存。