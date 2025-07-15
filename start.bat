@echo off
chcp 65001
echo === Sci-Copilot 启动脚本 ===
echo 正在启动 AI 科研助手...

REM 检查Python环境
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: Python 未安装或未添加到PATH
    pause
    exit /b 1
)

REM 进入后端目录
cd backend

REM 检查是否存在虚拟环境
if not exist "venv" (
    echo 创建Python虚拟环境...
    python -m venv venv
)

REM 激活虚拟环境
echo 激活虚拟环境...
call venv\Scripts\activate.bat

REM 安装依赖
echo 安装Python依赖...
pip install -r requirements.txt

REM 检查环境变量配置
if not exist ".env" (
    echo 创建环境变量文件...
    copy .env.example .env
    echo 请编辑 backend\.env 文件，配置您的API密钥
    echo 配置完成后，重新运行此脚本
    pause
    exit /b 1
)

REM 启动后端服务
echo 启动后端服务...
start /b python main.py

echo 后端服务已启动
echo API服务地址: http://localhost:8000

REM 等待后端服务启动
timeout /t 3 /nobreak >nul

REM 打开前端界面
echo 打开前端界面...
start "" "..\frontend\index.html"

echo === 启动完成 ===
echo 前端地址: file:///%CD%\..\frontend\index.html
echo 后端API: http://localhost:8000
echo API文档: http://localhost:8000/docs

echo 按任意键停止服务...
pause >nul

REM 停止后端服务
echo 停止后端服务...
taskkill /f /im python.exe

echo 服务已停止
pause