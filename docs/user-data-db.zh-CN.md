# 用户数据数据库（SQLite）

## 目标
- 统一存储不同用户信息（Second Me 用户 + 账户档案）
- 记录每次对话交互（用户输入、Agent 回复、状态、预览与交接产物）
- 支持检索（按用户、会话、关键词）

## 存储位置
- 默认：`.secondme/user-data.sqlite`
- 可通过环境变量覆盖：`USER_DATA_DB_PATH`

## 已接入的数据链路
- `GET/PATCH /api/account/profile`：读写用户档案，同时 upsert 到数据库用户表
- `POST /api/intake/chat`：每一轮对话都会写入 `intake_interactions`

## 查询接口
- `GET /api/account/users?q=&limit=`
- `GET /api/account/sessions?userId=&limit=`
- `GET /api/account/interactions?userId=&sessionId=&q=&limit=`

## 检索范围说明
- 用户检索：昵称、邮箱、电话、公司、职位、时区、备注、Second Me 原始用户信息
- 交互检索：用户消息、助手回复、需求摘要、设备类型、场景、风险、未知项

## 说明
- 当前使用 Node 内置 `node:sqlite`（Node 24+），无需安装本地 C++ 编译工具
- 运行时会看到 SQLite ExperimentalWarning，不影响功能
