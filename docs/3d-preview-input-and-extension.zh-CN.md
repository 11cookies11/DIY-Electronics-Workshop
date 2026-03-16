# 3D Preview 输入与扩展说明

## 目标

这套 3D Preview 系统支持根据设备输入自动生成：

- 外壳
- 主板
- 板上电子元件布局
- 外壳交互件布局
- assembled / exploded 两种视图

核心入口在 [sceneBuilder.ts](/d:/GitRepository/AI/SecondMeEmbeddedSoftwareStore/src/engine/preview/sceneBuilder.ts) 的 `buildPreviewScene(...)`。

## 最小输入

最小输入结构定义在 [types.ts](/d:/GitRepository/AI/SecondMeEmbeddedSoftwareStore/src/engine/preview/types.ts) 的 `PreviewInput`。

一个最小可工作的输入包含：

```ts
{
  shell: "cuboid",
  shellSize: { width: 80, height: 120, depth: 24 },
  board: {
    placement: "center",
    grid: { cols: 6, rows: 5 }
  },
  mainScreen: {
    face: "front",
    type: "display_panel",
    sizeMm: { width: 40, height: 60, depth: 4 }
  },
  ports: [
    { face: "bottom", type: "usb_c", sizeMm: { width: 10, height: 6, depth: 6 } }
  ],
  modules: [
    "esp32_s3",
    "battery",
    "bluetooth",
    "imu_sensor"
  ]
}
```

## 自动布局规则

系统会自动把元件分成两层：

- 主板层：电子元件
- 外壳层：屏幕、接口、按钮等交互件

当前规则是：

- `mainScreen` 一律放在外壳面
- `ports` 一律放在外壳面
- `modules` 默认进入主板布局
- 某些交互模块会被提升到外壳层
  - 当前已处理：`button_array`

## 新增一个元件需要补什么

新增元件主要改 [moduleRegistry.ts](/d:/GitRepository/AI/SecondMeEmbeddedSoftwareStore/src/engine/preview/moduleRegistry.ts)。

至少要补这些字段：

- `id`
- `category`
- `gridW`
- `gridH`
- `sizeMm`
- `preferredZone`
- `shape`

示例：

```ts
{
  id: "air_quality_sensor",
  category: "sensor",
  gridW: 1,
  gridH: 1,
  sizeMm: { width: 12, height: 6, depth: 12 },
  preferredZone: "edge",
  shape: "chip",
}
```

## 字段含义

- `category`
  - 决定颜色、优先级、默认 clearance
- `gridW / gridH`
  - 决定在主板网格中占多少格
- `sizeMm`
  - 决定可视尺寸和碰撞尺寸
- `preferredZone`
  - 决定优先出现在主板的哪个区域
- `shape`
  - 决定默认 3D 造型

## 元件放到主板还是外壳

建议遵循这条原则：

- 放主板：
  - MCU
  - 电源模块
  - 通信模块
  - 存储
  - 传感器
  - 驱动板
- 放外壳：
  - 屏幕
  - USB / RJ45 / 音频口 / 电源口
  - 按钮
  - 红外窗口
  - 麦克风孔 / 扬声器孔

如果一个元件是“交互件”，不要只放进 `modules`，而应该优先作为：

- `mainScreen`
- `ports`
- 或在 [sceneBuilder.ts](/d:/GitRepository/AI/SecondMeEmbeddedSoftwareStore/src/engine/preview/sceneBuilder.ts) 的 `isShellInteractionModule(...)` 中登记为外壳交互模块

## 新增外壳交互模块

如果新增的是类似按钮阵列、旋钮、前窗这类外壳件，建议同步补三处：

1. 在 [moduleRegistry.ts](/d:/GitRepository/AI/SecondMeEmbeddedSoftwareStore/src/engine/preview/moduleRegistry.ts) 增加元件定义
2. 在 [sceneBuilder.ts](/d:/GitRepository/AI/SecondMeEmbeddedSoftwareStore/src/engine/preview/sceneBuilder.ts) 的 `isShellInteractionModule(...)` 中标记
3. 在对应 mesh 里增加渲染
   - 当前交互件走 [PortMesh.tsx](/d:/GitRepository/AI/SecondMeEmbeddedSoftwareStore/src/components/viewer/PortMesh.tsx)

## 自动布局目前已经会做什么

- 主板尺寸参考模块面积与屏幕投影
- 主板与板上元件受外壳内腔约束
- 屏幕后方与接口后方会形成主板避让区
- 智能手表与红外遥控器有专门的分层模板偏好
- 板上元件默认平贴主板
- 按钮阵列等交互模块可挂到外壳面

## 什么时候需要补规则

出现以下情况时，通常需要补规则而不是只调尺寸：

- 元件应该在外壳上，却被放到了主板上
- 元件应该贴主板，却看起来像悬空
- 两个交互件在同一外壳面上重叠
- 某类设备结构明显不同于现有模板
- 某个元件需要特殊朝向

## 推荐扩展顺序

1. 先补 `moduleRegistry`
2. 再确认它属于主板层还是外壳层
3. 再补 mesh 表现
4. 最后再补特殊布局模板

## 当前限制

- 仍然是规则驱动，不是完整 CAD 装配系统
- 新元件如果没有规则，自动布局只能按默认分类推断
- 外壳交互模块目前还是少量特判，不是完整注册体系

## 一句话总结

现在这套系统已经可以做到：

**给定设备外壳、屏幕、接口和元件列表，自动生成 3D 布局预览。**

前提是新增元件要补齐尺寸、分类、区域和必要的层级规则。
