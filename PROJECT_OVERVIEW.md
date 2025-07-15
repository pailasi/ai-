# 项目概览

## 项目状态

✅ **项目已完成，可以立即使用！**

### 已实现功能

#### 🎨 AI科研绘图模块
- ✅ 文本生图API (`/api/v1/illustrator/text-to-image`)
- ✅ 图生图API (`/api/v1/illustrator/image-to-image`)
- ✅ 支持多种风格（科学插图、现代风格、简约风格）
- ✅ 可配置图像比例和背景

#### 📊 AI流程图生成模块
- ✅ 流程图生成API (`/api/v1/flowchart/generate`)
- ✅ 支持Mermaid.js语法
- ✅ 支持多种布局（从上到下、从左到右）
- ✅ 前端实时渲染SVG

#### 📚 智能文献处理模块
- ✅ PubMed集成搜索API (`/api/v1/literature/search`)
- ✅ 文献分析API (`/api/v1/literature/analyze`)
- ✅ 文献问答API (`/api/v1/literature/qa`)
- ✅ PDF文件上传分析API (`/api/v1/literature/analyze-pdf`)
- ✅ 支持DOI和PMID查询

#### 🛠️ 核心技术模块
- ✅ 通用API调用客户端 (`utils/api_caller.py`)
- ✅ PubMed API集成 (`utils/pubmed_api.py`)
- ✅ 环境变量配置支持
- ✅ 错误处理和日志记录

#### 🌐 用户界面
- ✅ 响应式Web界面
- ✅ 文件上传（拖拽支持）
- ✅ 实时结果展示
- ✅ 移动端适配

#### 📦 部署和运行
- ✅ 一键启动脚本（Linux/Mac/Windows）
- ✅ Docker支持
- ✅ 详细的配置文档

## 核心文件说明

### 后端核心文件

| 文件 | 功能 | 状态 |
|------|------|------|
| `backend/main.py` | FastAPI主应用，包含所有API端点 | ✅ 完成 |
| `backend/utils/api_caller.py` | 通用AI API调用客户端 | ✅ 完成 |
| `backend/utils/pubmed_api.py` | PubMed API集成模块 | ✅ 完成 |
| `backend/app/models/schemas.py` | 数据模型定义 | ✅ 完成 |
| `backend/requirements.txt` | Python依赖配置 | ✅ 完成 |
| `backend/.env.example` | 环境变量模板 | ✅ 完成 |

### 前端核心文件

| 文件 | 功能 | 状态 |
|------|------|------|
| `frontend/index.html` | 单页面应用，包含所有功能界面 | ✅ 完成 |

### 配置和部署文件

| 文件 | 功能 | 状态 |
|------|------|------|
| `start.sh` | Linux/Mac启动脚本 | ✅ 完成 |
| `start.bat` | Windows启动脚本 | ✅ 完成 |
| `Dockerfile` | Docker镜像配置 | ✅ 完成 |
| `docker-compose.yml` | Docker Compose配置 | ✅ 完成 |
| `nginx.conf` | Nginx配置 | ✅ 完成 |
| `README.md` | 项目文档 | ✅ 完成 |

## 支持的AI模型

| 模型 | 用途 | 配置变量 |
|------|------|----------|
| Google Gemini | 文本生成、文献分析 | `GEMINI_API_KEY` |
| Anthropic Claude | 高质量文本处理、流程图生成 | `CLAUDE_API_KEY` |
| OpenAI GPT/DALL-E | 文本生成、图像生成 | `OPENAI_API_KEY` |
| PubMed API | 文献搜索和获取 | `PUBMED_API_KEY` |

## 快速开始

1. **克隆项目**
   ```bash
   git clone [项目地址]
   cd sci-copilot
   ```

2. **配置API密钥**
   ```bash
   cd backend
   cp .env.example .env
   # 编辑.env文件，添加您的API密钥
   ```

3. **启动服务**
   ```bash
   # Linux/Mac
   ./start.sh
   
   # Windows
   start.bat
   ```

4. **使用应用**
   - 前端界面：通过浏览器访问自动打开的HTML文件
   - 后端API：http://localhost:8000
   - API文档：http://localhost:8000/docs

## 项目亮点

1. **完整的全栈解决方案**：从后端API到前端界面，一应俱全
2. **多模型支持**：支持主流AI模型，可根据需要选择
3. **即用配置**：提供完整的配置文件和启动脚本
4. **模块化设计**：代码结构清晰，易于扩展
5. **专业的科研功能**：针对科研场景深度定制

## 注意事项

1. **API密钥**：需要自行申请相应的AI服务API密钥
2. **网络访问**：确保能够访问对应的AI服务
3. **Python环境**：需要Python 3.9+环境
4. **依赖安装**：首次运行会自动安装依赖

## 扩展建议

1. **数据库支持**：可以添加数据库来存储历史记录
2. **用户系统**：添加用户认证和权限管理
3. **批量处理**：支持批量文献分析和图像处理
4. **更多模型**：集成更多AI模型和服务
5. **移动应用**：开发移动端应用

这个项目提供了一个完整的AI科研助手解决方案，可以直接使用，也可以作为基础进行进一步开发。