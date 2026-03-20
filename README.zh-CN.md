# DIY电子工坊

一个以 LLM 为核心、支持多 Agent 协同的 Demo 平台：把自然对话转成 DIY 电子产品预览与交接方案。  
语言：简体中文 | [English](README.md)

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)
![Multi-Agent](https://img.shields.io/badge/架构-多Agent协同-5B8DEF)
![License](https://img.shields.io/badge/License-MIT-green)

## 可视化展示

### 首页主截图

> 建议替换成真实产品截图。

![DIY电子工坊首页](docs/assets/screenshots/hero-overview.png)

### Demo 动图

> 建议替换成交互录屏导出的 GIF。

![DIY电子工坊流程演示](docs/assets/demo/workflow-demo.gif)

## 核心能力

- 前台接待 Agent：通过自然对话收集需求
- 多 Agent 协同面板：前台 / 硬件采购 / 软件负责人 / 交付
- 3D 主舞台预览：装配态与拆解态联动展示
- 根据对话上下文自动生成 handoff
- 轻量账户与交互记录（SQLite）
- 支持 Second Me OAuth + API，并兼容 DeepSeek 的 LLM-first 流程

## 前期验证

这个项目并不是从 0 开始的。我们在更早的仓库
[EmbeddedLoopDemo](https://github.com/11cookies11/EmbeddedLoopDemo)
中，已经对“嵌入式 AI Agent 闭环开发”做过可行性验证。DIY电子工坊是在这份验证基础上，继续往前推进到“多 Agent + 用户可直接交互的工坊形态”。

## 技术栈

- Next.js 16（App Router）
- React 19 + TypeScript
- React Three Fiber / Drei / Three.js
- Node `sqlite`（`DatabaseSync`）

## 本地启动

```bash
npm install
cp .env.example .env.local
# 编辑 .env.local
npm run dev
```

访问：`http://localhost:3000`

## 环境变量（重点）

Second Me 必填：

- `SECONDME_CLIENT_ID`
- `SECONDME_CLIENT_SECRET`
- `SECONDME_REDIRECT_URI`
- `SECONDME_API_BASE_URL`
- `SECONDME_OAUTH_URL`

LLM-first 推荐：

- `INTAKE_LLM_FIRST_MODE=true`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`（默认：`https://api.deepseek.com`）
- `DEEPSEEK_CHAT_MODEL`（例如：`deepseek-chat`）
- `DEEPSEEK_INTAKE_CHAT_MODEL`
- `DEEPSEEK_INTAKE_REASONING_MODEL`

## 常用命令

- `npm run dev`：开发模式
- `npm run build`：生产构建
- `npm run start`：生产启动
- `npm run demo:agents`：终端演示多 Agent 协同
- `npm run intake:regression`：回归测试 intake 流程
- `npm run deploy:docker`：Docker 部署辅助（PowerShell）

## Docker 部署

仓库内已包含：

- `Dockerfile`
- `docker-compose.prod.yml`

基础部署：

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f
```

默认映射端口：`${PORT:-3000}:3000`

## 目录结构

```text
src/
  app/                 # 页面与 API 路由
  components/          # UI、3D 预览、聊天组件
  lib/                 # intake 编排、Agent 协作、数据库、集成
scripts/               # 演示脚本与回归脚本
docs/                  # 方案文档、计划、测试报告
```

## 系统架构图

```mermaid
flowchart LR
    U[用户] --> C[前台聊天界面]
    C --> IA[Intake Agent Runtime]
    IA --> FD[前台 Agent]
    IA --> HP[硬件采购 Agent]
    IA --> SL[软件负责人 Agent]
    IA --> DL[交付 Agent]
    IA --> P[Preview 生成器]
    IA --> H[Handoff 生成器]
    IA --> DB[(SQLite 用户数据)]
    IA --> SM[Second Me API]
    IA --> DS[DeepSeek / LLM 接口]
    P --> V[3D 主舞台]
    H --> R[Handoff 页面]
```

## GitHub 访客推荐演示路径

1. 用户用自然语言描述一个 DIY 电子想法。
2. 前台 Agent 只补关键缺失信息。
3. 多 Agent 协同面板展示采购 / 软件 / 交付三方意见。
4. 系统生成 3D 预览草案。
5. 系统生成可执行 handoff。

## 相关文档

- Docker 部署：`docs/DEPLOY_DOCKER.zh-CN.md`
- LLM-first 迁移说明：`docs/LLM_FIRST_MIGRATION.zh-CN.md`
- 用户数据说明：`docs/user-data-db.zh-CN.md`

## 安全建议

- 不要提交 `.env.local`
- 密钥泄露后立即轮换
- 回调地址与线上访问地址保持完全一致

## 许可证

见 [LICENSE](LICENSE)。
