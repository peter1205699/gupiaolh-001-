# ------------------- 构建阶段 -------------------
FROM node:20-alpine AS builder

# 设置全局工作目录为 /app（Vercel 默认）
WORKDIR /app

# 先复制根目录 package.json（如果根有全局依赖，安装它们）
COPY package*.json ./
RUN npm ci --production  # 或 npm install --production，根据需要

# 切换到 backend 子目录
WORKDIR /app/backend

# 复制 backend 的 package.json 和 lockfile（缓存依赖安装）
COPY backend/package*.json ./

# 安装 backend 生产依赖
RUN npm ci --production  # npm ci 更严格、更快（推荐），或用 npm install --production

# 复制 backend 全部源码
COPY backend/ ./

# 如果 backend 有 build 脚本（如 tsc、esbuild），执行它
# RUN npm run build   # 如果没有 build 脚本，删除或注释这行

# ------------------- 生产阶段（减小镜像大小） -------------------
FROM node:20-alpine

# 设置最终工作目录为 backend
WORKDIR /app/backend

# 从 builder 复制 node_modules 和源码
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend ./

# 复制根目录 package.json（如果启动命令依赖它，可选）
COPY package*.json /app/

# 暴露端口（假设你的后端用 3000，根据实际调整）
EXPOSE 3000

# 设置生产环境
ENV NODE_ENV=production

# 启动命令：直接运行 backend 的 start 脚本
CMD ["npm", "start"]
