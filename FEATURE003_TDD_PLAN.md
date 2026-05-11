# FEATURE 003: Docker 镜像打包与一键部署

## 需求描述
实现前后端 Docker 镜像打包，生成 docker-compose 一键部署方案。

## 技术方案
- **前端**: 多阶段构建（Node.js 构建 Vue 应用 → nginx 提供静态文件服务）
- **后端**: Node.js 20 Alpine 运行 TypeScript 编译产物
- **nginx**: 反向代理 `/api`、`/api-docs`、`/swagger-ui` 到后端容器，SPA 路由回退
- **数据持久化**: Docker named volume 挂载 SQLite 数据库文件
- **环境变量**: JWT_SECRET、PORT 等通过 `.env` 文件注入
- **健康检查**: 后端 `/api/health` 端点用于 Docker healthcheck

## 架构图

```
┌─────────────────────────────────────────┐
│              docker-compose              │
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │   frontend    │    │   backend    │  │
│  │  nginx:80     │───▶│  node:8080   │  │
│  │  静态文件服务   │    │  API 服务     │  │
│  │  + 反向代理    │    │  + SQLite    │  │
│  └──────────────┘    └──────┬───────┘  │
│                             │           │
│                      ┌──────▼───────┐  │
│                      │  db-data     │  │
│                      │  (volume)    │  │
│                      └──────────────┘  │
└─────────────────────────────────────────┘
         用户访问 :80
```

## 任务清单

### 阶段一：Docker 基础文件
- [x] 1.1 创建 `.dockerignore` 排除不必要文件
- [x] 1.2 创建后端 `server/Dockerfile`（Node.js 20 Alpine + 多阶段 TypeScript 编译）
- [x] 1.3 创建前端 `Dockerfile`（多阶段：Node.js 构建 + nginx 服务）
- [x] 1.4 创建 `nginx.conf`（SPA 路由 + API/Swagger 反向代理 + gzip + 静态资源缓存）
- [x] 1.5 创建 `docker-compose.yml`（前后端编排 + 数据卷 + 环境变量 + healthcheck）
- [x] 1.6 创建 `.env.example` 环境变量示例 + `.gitignore` 添加 `.env`

### 阶段二：代码调整
- [x] 2.1 添加 `/api/health` 健康检查端点（routes/index.ts）
- [x] 2.2 数据库路径支持 `DB_PATH` 环境变量（db/database.ts）

### 阶段三：验证与提交
- [x] 3.1 运行全部测试（124 个）— 全部通过
- [x] 3.2 vue-tsc 类型检查 — 通过
- [x] 3.3 vite build 前端构建 — 成功
- [x] 3.4 server:build 后端编译 — 成功
- [x] 3.5 Git 提交 — c2e3d56
- [x] 3.6 更新 README.md — 已追加第11节 Docker 容器化部署实现要点
