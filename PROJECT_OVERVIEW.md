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

### 导师 AI 多 Skill 编排（Beta）

工作流 ID：`question_to_submission_paragraph`

执行顺序：
1. `mentor_dispatch_skill`：导师分派任务与约束
2. `analysis_agent_skill`：证据检索与写作建议
3. `writer_agent_skill`：段落改写
4. `manuscript_validate_skill`：结构化校验
5. `figure_agent_skill`：论文配图
6. `citation_agent_skill`：证据清单
7. `mentor_review_skill`：导师最终评审

人工接管点：
- 若校验阶段存在 high 风险问题，workflow 状态会进入 `needs_revision`
- 用户需通过 `POST /api/workflows/{session_id}/resume` 提交修订文本再继续

## 实际 API（与代码一致）

- `GET /`
- `GET /health`
- `GET /api/status`
- `POST /api/documents/upload`
- `POST /api/knowledge/ingest`
- `POST /api/chat`
- `POST /api/reasoning/method-compare`
- `POST /api/diagram`
- `POST /api/figure`
- `POST /api/workflows/run`
- `GET /api/workflows/{session_id}`
- `POST /api/workflows/{session_id}/resume`
- `POST /api/workflows/{session_id}/export`

## 关键文件

- `backend/main.py`：API 入口与路由
- `backend/services.py`：业务逻辑（文献索引、问答、出图）
- `backend/reasoning/contracts.py`：工具化推理链路输入输出契约
- `backend/schemas.py`：请求/响应模型
- `backend/config.py`：配置管理
- `frontend/index.html`：前端工作台
- `start.sh` / `start.bat`：本地一键启动
- `Dockerfile` / `docker-compose.yml`：容器化部署

## 运行说明

1. 复制 `backend/.env.example` 为 `backend/.env`
2. 按需配置 `GOOGLE_API_KEY`、`GLM_API_KEY`
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
- 测试与 CI 能力仍在建设中（已覆盖 smoke + workflow/skills 基础单测）

## 当前上线准备状态（Beta）

- 稳定性：文本模型路由已统一为主备链路，错误码与降级提示已结构化。
- 质量门禁：新增 `backend/test_chat_acceptance.py`，支持严格门禁与可选 live 验收。
- 运行口径：`/api/status` 提供稳定性指标定义、门槛目标和错误码动作映射（由后端统一输出）。
- 可解释性：前端已显式展示 `degraded` / `error_code` / `error_hint`，避免误判结果可信度。
- 可追溯性：workflow 结果与导出包包含证据追踪、步骤追踪和修订历史。
- 待补强：多用户隔离、线上监控告警、以及更大规模题集评测仍需继续建设。

## 导出条件

- 仅当 workflow 会话状态为 `completed` 才允许导出
- 导出内容包含段落、图注和证据清单三件套：
  - `paragraph_path`
  - `figure_caption_path`
  - `evidence_path`