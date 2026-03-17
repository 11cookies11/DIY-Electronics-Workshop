# Poly Pizza 自动下载脚本

仓库内提供了一个不依赖登录态的抓取脚本：

```bash
node scripts/poly-pizza-fetch.mjs --prompt "touch screen battery pcb"
```

它的工作方式是：

1. 根据 `prompt` 拆出几组英文搜索词
2. 抓取 Poly Pizza 搜索结果页
3. 对候选模型做简单打分
4. 进入模型详情页读取 `ResourceID`
5. 下载对应的 `.glb` 文件
6. 生成一份 `manifest.json`

## 推荐用法

```bash
node scripts/poly-pizza-fetch.mjs --prompt "embedded electronics touch screen battery sensor" --limit 6 --preview
```

默认下载目录：

```text
public/models/poly-pizza
```

## 常用参数

```bash
--prompt <text>      使用提示词自动拆搜索词
--queries <list>     手动指定搜索词，逗号分隔
--limit <number>     最多下载多少个模型
--per-query <number> 每个搜索页最多取多少个候选
--dir <path>         输出目录
--preview            连预览图一起下载
--dry-run            只打印结果，不实际下载
```

## 示例

只看候选，不下载：

```bash
node scripts/poly-pizza-fetch.mjs --prompt "usb c port sensor module" --dry-run
```

手动指定搜索词：

```bash
node scripts/poly-pizza-fetch.mjs --queries "touch screen,battery pack,pcb board" --limit 5
```

## 注意事项

- Poly Pizza 搜索结果主要是英文，`prompt` 建议尽量用英文。
- 这是一个“提示词到搜索词”的本地近似方案，不是官方 AI Asset Packs 的完整复刻。
- 搜出来的模型可能需要你后续人工筛一遍，尤其是 `screen`、`board` 这类词会带出不少泛结果。
