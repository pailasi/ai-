# 参与 Sci-Copilot 贡献

**语言 / Languages：** 简体中文 | [English](CONTRIBUTING.en.md)

感谢你愿意参与贡献。

## 上手

1. Fork 本仓库并从 `main` 创建功能分支。
2. 本地配置后端：
   - `cd backend`
   - `python -m venv venv`
   - 激活虚拟环境
   - `pip install -r requirements.txt`
3. 本地配置：
   - Windows：`copy .env.example .env`
   - macOS/Linux：`cp .env.example .env`
4. 运行 `python main.py`，浏览器打开 `http://localhost:8000`。

## 开发约定

- 改动尽量小且聚焦。
- 勿提交密钥（`.env`、密钥、令牌等）。
- 行为变更时请补充或更新测试。
- 除非在文档中明确说明并保持发布说明同步，否则保持 API 向后兼容。

## 测试要求

发起 PR 前建议执行：

- `cd backend`
- `python -m unittest test_smoke.py`
- `python -m unittest test_workflow_engine.py`

若改动触及特定模块，请一并运行相关测试文件。

## Pull Request 清单

- 说明面向用户的问题与改动动机。
- 写明实现要点与风险点。
- 说明测试覆盖及实际执行的命令。
- 若行为或配置变更，请同步更新文档（`README.md` / `README.en.md` / `PROJECT_OVERVIEW.md`）。

## 提交信息（推荐）

意图清晰的前缀示例：

- `fix: keep chat retrieval scoped to focused paper`
- `docs: clarify image provider routing and fallback behavior`
- `test: add regression case for ingestion status sync`

## 报告 Issue

创建 Issue 时请包含：

- 复现步骤
- 期望行为与实际行为
- 日志或 API 响应（脱敏）
- 环境信息（操作系统、Python 版本、provider 配置方式等）
