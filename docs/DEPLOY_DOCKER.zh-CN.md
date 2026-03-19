# Docker 部署说明（生产）

## 前置条件

- 已安装 Docker Desktop（含 `docker compose`）
- 项目根目录存在 `.env.local`（可复制 `.env.example` 后补齐）

## 一键部署

在项目根目录执行：

```powershell
npm run deploy:docker
```

脚本会自动执行：

1. 读取 `docker-compose.prod.yml`
2. 构建镜像（`--build`）
3. 后台启动容器
4. 打印容器状态

默认访问地址：

- `http://127.0.0.1:3000`

如果你设置了环境变量 `PORT`，会映射到该端口。

## 常用命令

查看日志：

```powershell
docker compose -f docker-compose.prod.yml logs -f
```

停止服务：

```powershell
docker compose -f docker-compose.prod.yml down
```

重新构建并启动：

```powershell
docker compose -f docker-compose.prod.yml up -d --build
```
