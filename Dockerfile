FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 复制requirements文件
COPY backend/requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY backend/ .

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["python", "main.py"]