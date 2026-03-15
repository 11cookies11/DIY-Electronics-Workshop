# 嵌入式 3D 预览引擎计划归档 v2

归档时间：2026-03-15

来源：此前 `.where-agent-progress.md` 中的旧版计划。

## 原计划

- [x] 归档旧版 3D 展示系统计划
- [x] 编写 3D 组件库设计规范文档
- [x] 建立模块注册表与基础组件库
- [x] 定义模块元数据 TypeScript Schema
- [x] 建立布局规则引擎骨架
- [x] 定义 Scene JSON Schema
- [x] 实现需求到模块选择的第一版映射
- [x] 实现 Scene Builder
- [x] 让 Three.js 渲染层消费 Scene JSON
- [~] 替换当前硬编码模板系统
- [ ] 让前台 AI Agent 改为驱动 Scene Builder

## 归档说明

这版计划围绕“模块选择 -> Scene JSON -> 旧渲染器兼容层”展开，已经完成了中间数据层与一部分渲染适配。

后续将切换到新的“3D 预览布局引擎”方案，核心抽象不再是旧的展示模板，而是：

- 外壳 `shell`
- 主板 `mainBoard`
- 六个面 `front/back/left/right/top/bottom`
- 主板网格布局
- 面挂载布局
- `PreviewScene` 场景输出

旧计划从此处冻结，后续实现进度以新的 `.where-agent-progress.md` 为准。
