# Sci-Copilot - AI科研助手

一个全流程AI科研辅助平台，通过API驱动的智能绘图、深度文献分析和自动化流程图生成，将前沿大型语言模型（LLM）无缝集成到科研工作流中。

## 🚀 项目特色

- **AI科研绘图**: 文本生图、图生图优化，支持科学插图风格
- **智能流程图**: 自动生成Mermaid.js流程图，支持SVG导出
- **文献智能分析**: 集成PubMed API，支持DOI/PMID搜索和AI分析
- **多模态支持**: 支持PDF上传、图像处理、文本分析
- **可配置API**: 支持Gemini、Claude、OpenAI等多种LLM模型

## 📋 功能概览

### 🎨 AI科研绘图
- **文本生图**: 输入科研文本，生成科学插图
- **图生图**: 上传图像，通过AI进行优化和编辑
- **多种风格**: 支持科学插图、现代风格、简约风格等

### 📊 AI流程图生成
- **智能生成**: 基于文本描述生成Mermaid.js流程图
- **多种布局**: 支持从上到下、从左到右等布局
- **SVG导出**: 生成可编辑的SVG格式图表

### 📚 智能文献处理
- **PubMed集成**: 通过DOI、PMID或关键词搜索文献
- **AI分析**: 自动总结文献内容，提取关键信息
- **文献问答**: 基于文献内容回答问题
- **PDF处理**: 上传PDF文件进行内容分析

## 🛠️ 技术架构

### 后端技术栈
- **Python 3.9+**: 主要编程语言
- **FastAPI**: 高性能API框架
- **Pydantic**: 数据验证和序列化
- **Requests**: HTTP客户端
- **PDFPlumber**: PDF文本提取

### 前端技术栈
- **HTML5 + CSS3**: 现代Web标准
- **JavaScript ES6+**: 前端交互逻辑
- **Mermaid.js**: 流程图渲染

### 支持的AI模型
- **Google Gemini**: 文本生成和分析
- **Anthropic Claude**: 高质量文本处理
- **OpenAI GPT**: 通用文本生成
- **DALL-E 3**: 图像生成和编辑

## 🚀 快速开始

### 方法一：使用启动脚本（推荐）

#### Linux/Mac
```bash
# 克隆项目
git clone https://github.com/yourusername/sci-copilot.git
cd sci-copilot

# 给启动脚本添加执行权限
chmod +x start.sh

# 运行启动脚本
./start.sh
```

#### Windows
```batch
# 克隆项目
git clone https://github.com/yourusername/sci-copilot.git
cd sci-copilot

# 运行启动脚本
start.bat
```

### 方法二：手动启动

#### 1. 环境准备
```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate.bat  # Windows

# 安装依赖
cd backend
pip install -r requirements.txt
```

#### 2. 配置API密钥
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑.env文件，添加您的API密钥
# GEMINI_API_KEY=your_gemini_api_key
# CLAUDE_API_KEY=your_claude_api_key
# OPENAI_API_KEY=your_openai_api_key
# PUBMED_API_KEY=your_pubmed_api_key
```

#### 3. 启动服务
```bash
# 启动后端服务
python main.py

# 在浏览器中打开前端界面
# 访问 frontend/index.html
```

### 方法三：Docker部署

```bash
# 构建并启动服务
docker-compose up -d

# 访问应用
# 前端: http://localhost
# 后端API: http://localhost:8000
# API文档: http://localhost:8000/docs
```

## 📝 API密钥配置

### 获取API密钥

1. **Google Gemini**
   - 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
   - 创建API密钥

2. **Anthropic Claude**
   - 访问 [Anthropic Console](https://console.anthropic.com/)
   - 创建API密钥

3. **OpenAI**
   - 访问 [OpenAI Platform](https://platform.openai.com/api-keys)
   - 创建API密钥

4. **PubMed (可选)**
   - 访问 [NCBI API Keys](https://www.ncbi.nlm.nih.gov/account/settings/)
   - 创建API密钥

### 配置环境变量

在 `backend/.env` 文件中配置：

```env
# API Keys
GEMINI_API_KEY=your_gemini_api_key_here
CLAUDE_API_KEY=your_claude_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
PUBMED_API_KEY=your_pubmed_api_key_here

# API Base URLs (可选，使用代理时修改)
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
CLAUDE_BASE_URL=https://api.anthropic.com/v1
OPENAI_BASE_URL=https://api.openai.com/v1
```

## 📖 使用指南

### 文本生图
1. 选择"文本生图"标签页
2. 输入科研文本内容（如论文摘要）
3. 选择绘图风格和参数
4. 点击"生成图像"

### 图生图
1. 选择"图生图"标签页
2. 上传基础图像
3. 输入修改描述
4. 点击"编辑图像"

### 流程图生成
1. 选择"流程图"标签页
2. 描述流程步骤
3. 选择流程方向和风格
4. 点击"生成流程图"

### 文献分析
1. 选择"文献分析"标签页
2. 根据需要选择子功能：
   - **搜索**: 使用关键词搜索PubMed
   - **分析**: 输入DOI/PMID进行文献分析
   - **问答**: 基于文献内容回答问题
   - **PDF**: 上传PDF文件进行分析

## 🔧 API文档

启动后端服务后，访问以下地址查看详细的API文档：

- **交互式API文档**: http://localhost:8000/docs
- **ReDoc文档**: http://localhost:8000/redoc

### 主要API端点

- `POST /api/v1/illustrator/text-to-image` - 文本生图
- `POST /api/v1/illustrator/image-to-image` - 图生图
- `POST /api/v1/flowchart/generate` - 生成流程图
- `POST /api/v1/literature/analyze` - 文献分析
- `POST /api/v1/literature/qa` - 文献问答
- `GET /api/v1/literature/search` - 搜索文献

## 📁 项目结构

```
sci-copilot/
├── backend/                 # 后端代码
│   ├── app/
│   │   ├── api/            # API路由
│   │   ├── core/           # 核心配置
│   │   ├── models/         # 数据模型
│   │   └── services/       # 业务逻辑
│   ├── utils/              # 工具函数
│   │   ├── api_caller.py   # API调用客户端
│   │   └── pubmed_api.py   # PubMed API集成
│   ├── main.py             # 应用入口
│   ├── requirements.txt    # Python依赖
│   └── .env.example        # 环境变量模板
├── frontend/               # 前端代码
│   └── index.html          # 单页面应用
├── docs/                   # 文档
├── docker-compose.yml      # Docker配置
├── Dockerfile             # Docker镜像
├── nginx.conf             # Nginx配置
├── start.sh               # Linux/Mac启动脚本
├── start.bat              # Windows启动脚本
└── README.md              # 项目说明
```

## 🚨 注意事项

1. **API密钥安全**: 请妥善保管API密钥，不要提交到版本控制系统
2. **使用限制**: 各AI服务有调用限制，请合理使用
3. **网络连接**: 确保网络可以访问相关AI服务
4. **文件大小**: 上传的图像和PDF文件建议小于10MB

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 📄 许可证

本项目采用 MIT 许可证。详情请参见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- Google Gemini API
- Anthropic Claude API
- OpenAI API
- PubMed/NCBI API
- Mermaid.js
- FastAPI
---

**让AI为科研加速！🚀**
