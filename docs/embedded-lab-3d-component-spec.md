# 嵌入式实验室 3D 组件库设计规范

版本：0.1

作者：Embedded Lab Project

目标读者：Codex / AI Agent / 前端开发者

## 1. 文档目标

本文档定义嵌入式实验室 3D 预览系统的核心建模规范。

系统目标不是做 CAD，而是把用户的嵌入式想法快速转换为：

- 模块组成
- 系统结构
- 连接关系
- 数据流
- 3D 概念示意场景

本文档重点解决以下问题：

1. AI 可以选择哪些模块
2. 模块如何描述
3. 模块如何组合
4. 如何从需求生成 Scene JSON
5. 如何让 Three.js / React Three Fiber 渲染这些结果

## 2. 系统边界

本系统不负责：

- 精确机械尺寸
- PCB 细节
- 工业设计外观
- 写实材质
- CAD 级装配约束

本系统负责：

- 概念级模块组合
- 可解释的结构布局
- 嵌入式系统模块关系表达
- 面向客户演示的低成本 3D 可视化

## 3. 总体架构

系统流程：

```text
用户需求
  -> AI需求解析
  -> 模块选择引擎
  -> 布局规则引擎
  -> Scene JSON 生成
  -> Three.js 渲染
```

## 4. 系统分层

系统分为五层：

1. 组件库
2. 模块选择
3. 布局规则
4. 场景生成
5. 3D 渲染

### 4.1 组件库层

组件库是系统基础。

AI 只能从组件库中选择模块，不允许发明新的模块类型。

### 4.2 模块选择层

根据需求关键词、能力标签和规则映射选择模块。

### 4.3 布局规则层

根据嵌入式系统的一般结构规则，为模块分配位置和层级。

### 4.4 场景生成层

将模块选择结果和布局结果转换为统一的 Scene JSON。

### 4.5 渲染层

Three.js / React Three Fiber 根据 Scene JSON 创建几何体、连线和动画。

## 5. 组件库分类

### 5.1 控制类

- `esp32_board`
- `stm32_board`
- `control_core`
- `io_expander`

### 5.2 通信类

- `wifi_module`
- `bluetooth_module`
- `ethernet_module`
- `rs485_module`
- `can_module`
- `lte_module`

### 5.3 传感类

- `temp_humidity_sensor`
- `imu_sensor`
- `camera_sensor`
- `distance_sensor`
- `current_sensor`

### 5.4 执行类

- `relay_module`
- `motor_driver`
- `led_driver`
- `servo_driver`

### 5.5 电源类

- `battery_pack`
- `dc_input`
- `buck_converter`
- `power_protection`

### 5.6 人机交互类

- `display_panel`
- `button_pad`
- `knob_input`
- `status_led`

### 5.7 结构类

- `base_plate`
- `shell_body`
- `top_cover`
- `mount_bracket`

### 5.8 可视化类

- `label_tag`
- `data_flow_line`
- `signal_particle`
- `highlight_frame`

## 6. 模块元数据结构

推荐使用统一的模块定义：

```ts
type ModuleComponent = {
  id: string;
  name: string;
  category:
    | "controller"
    | "sensor"
    | "power"
    | "communication"
    | "actuator"
    | "ui"
    | "structure";
  shape:
    | "board"
    | "chip"
    | "box"
    | "panel"
    | "connector"
    | "wire";
  size: "s" | "m" | "l";
  mountType:
    | "base"
    | "stack"
    | "side"
    | "external"
    | "floating";
  anchorPoints: string[];
  connectableTo: string[];
  preferredPlacement:
    | "center"
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "front"
    | "rear"
    | "outer";
  visualStyle: {
    emissive?: boolean;
    label?: boolean;
    accentType?: "data" | "power" | "signal" | "neutral";
  };
  sceneRole:
    | "core"
    | "support"
    | "io"
    | "display"
    | "shell";
};
```

## 7. 推荐组件注册结构

建议在代码中维护一个注册表：

```ts
type ModuleRegistry = Record<string, ModuleComponent>;
```

推荐文件：

- `src/components/lab/module-registry.ts`
- `src/components/lab/module-catalog.ts`

## 8. 几何模型策略

统一使用简单几何体，不使用复杂网格模型。

| 类型 | 几何 |
| --- | --- |
| `board` | 扁平盒体 |
| `chip` | 小方块 |
| `panel` | 薄面板 |
| `connector` | 小凸块 |
| `wire` | 曲线 |
| `shell` | 半透明外壳 |

优点：

- 风格统一
- 性能开销低
- AI 易于理解
- 适合自动生成 Scene JSON

## 9. 布局规则引擎

AI 不允许自由摆放模块，必须遵循嵌入式系统结构规则。

### 9.1 基础布局规则

- 控制板放中心
- 通信模块放顶部或侧边
- 传感器尽量靠外侧
- 电源模块放底部或后侧
- 显示屏放正面
- 执行模块靠输出侧
- 外壳包裹整体

### 9.2 布局示意

```text
        WIFI
          ▲
          │
 SENSOR ─ MCU ─ RELAY
          │
        POWER
```

### 9.3 布局算法建议

推荐先用规则引擎，而不是物理模拟：

1. 先确定核心模块
2. 再按 `preferredPlacement` 分区
3. 按 `sceneRole` 决定层级
4. 按连接关系做微调
5. 最后生成 assembled / exploded 两套位置

## 10. Scene JSON 结构

AI 不直接生成 Three.js 对象，而是生成 Scene JSON。

建议结构：

```json
{
  "view": "exploded",
  "modules": [
    {
      "id": "controller",
      "type": "esp32_board",
      "position": [0, 0, 0]
    },
    {
      "id": "wifi",
      "type": "wifi_module",
      "position": [0, 1.2, 0]
    },
    {
      "id": "sensor",
      "type": "temp_sensor",
      "position": [-1.2, 0.4, 0]
    }
  ],
  "connections": [
    {
      "from": "sensor",
      "to": "controller",
      "kind": "data"
    },
    {
      "from": "controller",
      "to": "wifi",
      "kind": "signal"
    }
  ]
}
```

建议补充字段：

- `template`
- `theme`
- `focus`
- `highlights`
- `shell`
- `camera`

## 11. 渲染器职责

渲染器只做：

- 解析 Scene JSON
- 创建模块对象
- 创建连接线
- 创建流动粒子
- 创建高亮与标签

支持视图：

- 装配视图
- 爆炸视图
- 拓扑视图

支持交互：

- 旋转
- 缩放
- 模块高亮
- 鼠标提示
- 连接动画

## 12. 视觉风格

整体风格：

- 低多边形
- 科技 UI
- 嵌入式实验室

推荐配色：

- 信号：青色
- 电源：橙色
- 数据：绿色
- 中性：灰色

推荐视觉效果：

- 发光边缘
- 数据流粒子
- 半透明外壳
- 标签卡片

## 13. AI 职责边界

AI 只负责：

1. 解析需求
2. 选择模块
3. 应用布局规则
4. 生成 Scene JSON

AI 不负责：

- 生成模型
- 发明模块
- 设计几何体
- 直接操作 Three.js 网格

## 14. 示例需求映射

用户输入：

```text
温湿度采集
wifi 上传
本地显示
继电器控制
电池供电
```

系统应选择：

- `esp32_board`
- `wifi_module`
- `temp_humidity_sensor`
- `display_panel`
- `relay_module`
- `battery_pack`

## 15. 建议开发阶段

### 第一阶段

建立组件库，目标 20 到 40 个模块。

### 第二阶段

实现布局规则引擎。

### 第三阶段

实现 Scene JSON 生成。

### 第四阶段

实现 Three.js 渲染系统。

### 第五阶段

接入 AI 自动编排。

## 16. 推荐下一步落地项

建议优先新增这些文件：

- `src/components/lab/module-registry.ts`
- `src/components/lab/layout-rules.ts`
- `src/components/lab/scene-schema.ts`
- `src/components/lab/scene-builder.ts`

## 17. 最终愿景

用户描述一个嵌入式想法：

```text
Idea
 -> 模块选择
 -> 自动组合
 -> 3D 系统预览
```

用户可以立刻看到：

- 系统由哪些模块组成
- 模块如何连接
- 数据如何流动
- 一个合理的嵌入式系统概念结构
