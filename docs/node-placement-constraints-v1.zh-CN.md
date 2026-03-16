# Node 姿态与摆放约束设计 v1

## 目标

让 `node` 不只是一个摆在空间里的几何体，而是一个具备以下能力的电子元件对象：

- 安装语义
- 姿态语义
- 占位语义
- 净空约束
- 尺寸可调

这个模型主要服务于预览系统中的装配图、爆炸图和后续真实模型替换。

## 基础原则

### 主板作为基本面

- `main-board` 是内部布局的基础安装面
- 板上元件默认安装在主板上
- 板上元件的摆放优先基于主板局部坐标，而不是世界坐标

### 外壳作为外部安装面

- 屏幕、接口、开孔、窗口类元件优先附着在外壳面
- 它们的朝向需要同时满足安装要求和对外功能要求

### 依附关系优先于几何位置

布局应先回答：

1. 元件附着在哪个参考对象上
2. 元件通过哪个安装面对接
3. 元件的功能面需要朝向哪里

然后再计算最终的世界坐标与旋转。

## Node 约束的 4 类信息

### 1. 安装信息

描述元件装在哪里。

核心概念：

- `anchorNodeId`
- `anchorFace`
- `selfMountFace`
- `preferredZone`

示例：

- MCU：底面贴主板顶面
- 屏幕：背面贴前壳内侧
- USB 接口：安装面贴边缘区域

### 2. 姿态信息

描述元件朝哪里。

核心概念：

- `selfMountFace`
- `functionalFace`
- `upFace`
- `targetDirection`

姿态分成两步求解：

1. 安装面对齐
2. 功能朝向校正

示例：

- USB-C：底面贴板，接口口子朝外
- 摄像头：安装后镜头朝前
- 屏幕：显示面朝外

### 3. 占位信息

描述元件本体会不会压住别的元件。

核心概念：

- `visualSize`
- `footprint`
- `bodyBounds`
- `clearance`

说明：

- `footprint` 用于主板平面占地检测
- `bodyBounds` 用于简单 3D 碰撞检测
- `clearance` 用于留出装配安全间距

### 4. 功能净空信息

描述元件周边哪些区域不能被挡。

核心概念：

- `keepout`

示例：

- USB 接口前方要留插拔空间
- 摄像头前方要留视野空间
- 屏幕后方要留净空
- 风扇周围要留风道

## 推荐的最小字段模型

```ts
type NodeFace = "top" | "bottom" | "front" | "back" | "left" | "right";

type PlacementZone = "center" | "top" | "bottom" | "left" | "right" | "edge";

type TargetDirection =
  | "deviceFront"
  | "deviceBack"
  | "deviceLeft"
  | "deviceRight"
  | "deviceTop"
  | "deviceBottom"
  | "outward"
  | "inward";

type NodePlacementConstraint = {
  anchorNodeId: string;
  anchorFace: NodeFace;
  selfMountFace: NodeFace;
  preferredZone?: PlacementZone;
};

type NodePoseConstraint = {
  functionalFace?: NodeFace;
  upFace?: NodeFace;
  targetDirection?: TargetDirection;
};

type NodeCollisionConstraint = {
  clearance?: number;
  footprintPadding?: number;
  bodyPadding?: number;
  keepout?: {
    front?: number;
    back?: number;
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  };
};

type NodeDimensions = {
  visual: {
    width: number;
    height: number;
    depth: number;
  };
  footprint?: {
    width: number;
    depth: number;
  };
};

type SceneNodeConstraint = {
  placement: NodePlacementConstraint;
  pose?: NodePoseConstraint;
  collision?: NodeCollisionConstraint;
  priority?: number;
};
```

## 姿态求解规则

### 安装面对齐

先将元件的 `selfMountFace` 与目标面的 `anchorFace` 对齐。

这一步解决：

- 元件如何贴到主板或外壳上
- 元件的基础旋转

### 功能朝向校正

再根据 `functionalFace` 和 `targetDirection` 做第二次姿态校正。

这一步解决：

- 接口必须朝外
- 屏幕必须朝外
- 摄像头必须朝前
- 麦克风必须朝开孔方向

### 结论

姿态不是直接手填 `rotation`，而应由：

- 安装约束
- 功能朝向约束

共同推导。

## 如何避免元件互相碾压

### 第一层：2D 占地检测

对安装在主板上的元件，先计算投影到主板平面的 `footprint`。

检测内容：

- footprint 是否重叠
- 是否满足 `clearance`

这是最重要也最划算的一层。

### 第二层：3D 体积检测

在 footprint 合法后，再检查 `bodyBounds` 是否发生 3D 相交。

这一步用于避免：

- 高件穿插
- 电池压进别的模块
- 大件互相碾压

### 第三层：keepout 检测

最后再检测 `keepout` 是否冲突。

这一步用于避免：

- 接口前方被挡
- 摄像头视野被挡
- 风道被堵
- 屏幕后方空间不足

## 尺寸可调原则

### 应作为系统能力支持的元件

- 主板
- 屏幕
- 电池
- 外壳
- 大面板类模块

### 可部分调节的元件

- 散热片
- 风扇
- 摄像头模组
- 驱动板

### 通常固定但允许 override 的元件

- MCU 模块
- 小传感器
- 小通信模块
- 小存储芯片

### 尺寸调整必须同步影响

尺寸变化不能只改视觉大小，必须同步影响：

1. 渲染大小
2. footprint
3. 体积碰撞
4. 安装贴合位置

## 推荐的布局优先级

大件先放，小件补位。

建议优先级：

1. 主板
2. 屏幕
3. MCU / 主控
4. 电池
5. 大接口
6. 摄像头 / 麦克风 / 关键传感器
7. 通信模块
8. 电源小件
9. 小传感器 / 指示灯 / 小芯片

## 第一阶段建议落地范围

为了控制复杂度，第一阶段建议只做以下能力：

- 主板作为基础安装面
- 板上元件通过安装面贴合主板
- 接口、屏幕、摄像头支持功能面朝向约束
- 使用 footprint + clearance 检测避免重叠
- 为少量关键元件增加 keepout
- 支持主板和屏幕尺寸可调

## 第一阶段结论

`node` 应从“一个摆在空间里的盒子”，升级为：

**一个带安装面、功能面、占位体积、净空约束和尺寸能力的电子元件。**
