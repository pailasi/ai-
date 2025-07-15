#!/bin/bash

# Sci-Copilot 启动脚本

echo "=== Sci-Copilot 启动脚本 ==="
echo "正在启动 AI 科研助手..."

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "错误: Python3 未安装"
    exit 1
fi

# 进入后端目录
cd backend

# 检查是否存在虚拟环境
if [ ! -d "venv" ]; then
    echo "创建Python虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "激活虚拟环境..."
source venv/bin/activate

# 安装依赖
echo "安装Python依赖..."
pip install -r requirements.txt

# 检查环境变量配置
if [ ! -f ".env" ]; then
    echo "创建环境变量文件..."
    cp .env.example .env
    echo "请编辑 backend/.env 文件，配置您的API密钥"
    echo "配置完成后，重新运行此脚本"
    exit 1
fi

# 启动后端服务
echo "启动后端服务..."
python main.py &
BACKEND_PID=$!

echo "后端服务已启动 (PID: $BACKEND_PID)"
echo "API服务地址: http://localhost:8000"

# 等待后端服务启动
sleep 3

# 检查是否有浏览器可用
if command -v xdg-open &> /dev/null; then
    echo "打开前端界面..."
    xdg-open "../frontend/index.html"
elif command -v open &> /dev/null; then
    echo "打开前端界面..."
    open "../frontend/index.html"
else
    echo "请手动打开浏览器，访问: ../frontend/index.html"
fi

echo "=== 启动完成 ==="
echo "前端地址: file://$PWD/../frontend/index.html"
echo "后端API: http://localhost:8000"
echo "API文档: http://localhost:8000/docs"

# 等待用户输入来停止服务
echo "按回车键停止服务..."
read

# 停止后端服务
echo "停止后端服务..."
kill $BACKEND_PID

echo "服务已停止"