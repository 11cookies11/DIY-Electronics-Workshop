import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const projectRoot = process.cwd();
const runtimeRoot = path.join(projectRoot, ".where", "diy-agent-e2e-25-runtime");
const reportRoot = path.join(projectRoot, "docs", "test-reports");

const sourceFiles = [
  ...[
    "archetypes.ts",
    "collaboration.ts",
    "conversation-base.ts",
    "knowledge-config.ts",
    "knowledge.ts",
    "llm-config.ts",
    "llm-client.ts",
    "llm-native.ts",
    "memory.ts",
    "orchestration.ts",
    "prompt-config.ts",
    "prompt.ts",
    "readiness.ts",
    "reasoning.ts",
    "reminders.ts",
    "secondme-client.ts",
    "signals.ts",
    "skill-config.ts",
    "skills.ts",
    "state-pipeline.ts",
    "suggestions.ts",
    "transitions.ts",
    "types.ts",
    "workflow.ts",
  ].map((file) => ({
    source: path.join(projectRoot, "src", "lib", "intake", file),
    target: path.join(runtimeRoot, "lib", "intake", file.replace(/\.ts$/, ".js")),
  })),
];

const scenarios = [
  {
    name: "smart_watch_health",
    title: "智能健康手表",
    steps: [
      "我想做一个智能健康手表，给家里老人用。",
      "主要看心率、血氧、睡眠，白天活动提醒。",
      "希望有触屏，保留一个实体按键，表带可更换。",
      "内置可充电电池，磁吸充电。",
      "先出一版预览。",
      "继续推进，给我一版交接。",
    ],
  },
  {
    name: "desk_pm_monitor",
    title: "桌面空气质量监测仪",
    steps: [
      "我想做一个桌面空气质量监测仪，放会议室。",
      "要看 PM2.5、CO2、温湿度，最好带灯光提示。",
      "希望前面有小屏幕，侧边一个确认按键。",
      "Type-C 供电，偶尔可电池应急。",
      "先出一版预览。",
      "继续推进，给我 handoff。",
    ],
  },
  {
    name: "pet_feeder_controller",
    title: "宠物喂食器控制终端",
    steps: [
      "我想做一个宠物喂食器控制终端。",
      "要定时喂食，支持远程查看喂食状态。",
      "有小屏幕和两个快捷键，家里用。",
      "内置电池，断电可继续工作几小时。",
      "先出一版预览。",
      "继续推进。",
    ],
  },
  {
    name: "diy_ir_remote",
    title: "DIY 红外遥控器",
    steps: [
      "我想做一个 DIY 红外遥控器，控制客厅家电。",
      "主要控制空调、电视和投影，按场景一键切换。",
      "触屏为主，保留音量和电源实体键。",
      "内置电池，Type-C 充电。",
      "先出一版预览。",
      "继续推进，整理交接。",
    ],
  },
  {
    name: "mini_label_printer",
    title: "便携标签打印机",
    steps: [
      "我想做一个便携标签打印机，仓库盘点用。",
      "要蓝牙连接手机，支持快速打印二维码标签。",
      "小屏显示状态，两个操作按键。",
      "内置电池，可连续工作半天。",
      "先出一版预览。",
      "继续推进，交付计划也给我。",
    ],
  },
  {
    name: "camping_lantern",
    title: "露营智能灯",
    steps: [
      "我想做一个露营用的智能灯。",
      "需要多档亮度和 SOS 闪烁。",
      "顶部一个旋钮，侧面一个按键。",
      "电池供电，Type-C 充电。",
      "先出预览。",
      "给我一版交接。",
    ],
  },
  {
    name: "doorbell_terminal",
    title: "门铃显示终端",
    steps: [
      "想做一个门铃显示终端，放在玄关。",
      "有人按门铃时显示来访提醒。",
      "屏幕触控，保留返回键。",
      "外接供电，断电可短时电池应急。",
      "先看预览。",
      "继续推进 handoff。",
    ],
  },
  {
    name: "kitchen_timer",
    title: "厨房定时提醒器",
    steps: [
      "想做一个厨房用的定时提醒器。",
      "要有倒计时、烹饪提醒和蜂鸣。",
      "正面屏幕，侧面旋钮调时间。",
      "可充电电池。",
      "先出一版预览。",
      "继续交接。",
    ],
  },
  {
    name: "office_focus_timer",
    title: "专注番茄钟终端",
    steps: [
      "我想做一个办公室番茄钟终端。",
      "要有工作/休息切换和进度显示。",
      "一个触控屏，两个快捷键。",
      "Type-C 供电。",
      "先生成预览。",
      "继续推进到 handoff。",
    ],
  },
  {
    name: "meeting_signage",
    title: "会议室状态牌",
    steps: [
      "我想做会议室门口状态牌。",
      "要显示空闲/占用，并可手动切换。",
      "小屏+按键交互。",
      "外接供电。",
      "先出预览。",
      "继续推进交接。",
    ],
  },
  {
    name: "plant_monitor",
    title: "盆栽环境监测器",
    steps: [
      "我想做个盆栽环境监测器。",
      "看土壤湿度、温度和光照。",
      "小屏显示，按键翻页。",
      "电池供电。",
      "先出一版预览。",
      "继续给我 handoff。",
    ],
  },
  {
    name: "sleep_white_noise",
    title: "助眠白噪音机",
    steps: [
      "想做一个助眠白噪音机。",
      "支持几种声音和定时关闭。",
      "旋钮调音量，按键切换模式。",
      "内置电池。",
      "先出预览。",
      "继续推进交接。",
    ],
  },
  {
    name: "bike_dashboard",
    title: "自行车小仪表",
    steps: [
      "我想做自行车把上的小仪表。",
      "显示速度和里程提醒。",
      "小屏+两个按键。",
      "电池供电，USB-C 充电。",
      "先看看预览。",
      "继续给交接。",
    ],
  },
  {
    name: "classroom_noise_meter",
    title: "教室噪声提示器",
    steps: [
      "想做一个教室噪声提示器。",
      "声音太大时亮灯提醒。",
      "前面小屏，侧边按键。",
      "外接供电。",
      "先出预览。",
      "继续推进。",
    ],
  },
  {
    name: "warehouse_counter",
    title: "仓库计数器终端",
    steps: [
      "我想做仓库入库计数器。",
      "支持加减计数和重置。",
      "实体按键为主，带显示屏。",
      "可充电电池。",
      "先出预览。",
      "继续 handoff。",
    ],
  },
  {
    name: "elderly_med_reminder",
    title: "老人吃药提醒器",
    steps: [
      "想做给老人用的吃药提醒器。",
      "要定时提醒和按键确认。",
      "屏幕字体要大。",
      "电池供电。",
      "先出预览。",
      "继续推进交接。",
    ],
  },
  {
    name: "desk_weather_clock",
    title: "桌面天气时钟",
    steps: [
      "我想做一个桌面天气时钟。",
      "显示时间、温湿度和天气。",
      "触控屏操作。",
      "Type-C 供电。",
      "先看预览。",
      "继续给 handoff。",
    ],
  },
  {
    name: "home_music_remote",
    title: "家庭音乐控制器",
    steps: [
      "想做一个家庭音乐控制器。",
      "可切歌、调音量、显示播放状态。",
      "旋钮+按键交互。",
      "内置电池。",
      "先生成预览。",
      "继续推进交接。",
    ],
  },
  {
    name: "ac_controller",
    title: "空调专用控制器",
    steps: [
      "我想做空调专用控制器。",
      "需要温度调节和模式切换。",
      "触屏为主，保留电源键。",
      "可充电。",
      "先出预览。",
      "继续 handoff。",
    ],
  },
  {
    name: "study_lamp_panel",
    title: "学习灯控制面板",
    steps: [
      "想做学习灯控制面板。",
      "亮度、色温可调，带专注计时。",
      "触控滑条+按键。",
      "外接供电。",
      "先看预览。",
      "继续交接。",
    ],
  },
  {
    name: "coffee_scale_display",
    title: "咖啡电子秤显示器",
    steps: [
      "我想做一个咖啡电子秤显示器。",
      "显示重量和计时。",
      "小屏幕，触摸按键。",
      "可充电电池。",
      "先出预览。",
      "继续推进 handoff。",
    ],
  },
  {
    name: "garage_sensor_hub",
    title: "车库传感中控",
    steps: [
      "想做车库传感器中控终端。",
      "看温湿度和开门状态。",
      "屏幕+确认按键。",
      "Type-C 供电。",
      "先出预览。",
      "继续推进交接。",
    ],
  },
  {
    name: "shop_queue_device",
    title: "门店排队提醒器",
    steps: [
      "我想做门店排队提醒器。",
      "叫号提示和队列显示。",
      "屏幕加两个按键。",
      "外接供电。",
      "先生成预览。",
      "继续给我 handoff。",
    ],
  },
  {
    name: "travel_power_monitor",
    title: "旅行电源监测仪",
    steps: [
      "想做旅行电源监测仪。",
      "显示电量、输出状态和提醒。",
      "小触屏交互。",
      "电池供电，Type-C 充电。",
      "先出预览。",
      "继续推进交接。",
    ],
  },
  {
    name: "room_air_fan_remote",
    title: "房间风扇遥控终端",
    steps: [
      "我想做房间风扇遥控终端。",
      "控制风速和定时。",
      "触屏为主，保留实体确认键。",
      "内置可充电电池。",
      "先看一版预览。",
      "继续整理 handoff。",
    ],
  },
];

function rewriteSpecifiers(sourceText) {
  return sourceText
    .replace(/from\s+"(\.\/[^"]+)"/g, 'from "$1.js"')
    .replace(/from\s+"@\/lib\/secondme"/g, 'from "../secondme.js"');
}

async function transpileFile(entry) {
  const raw = await readFile(entry.source, "utf8");
  const rewritten = rewriteSpecifiers(raw);
  const transpiled = ts.transpileModule(rewritten, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
    fileName: path.basename(entry.source),
  }).outputText;

  await mkdir(path.dirname(entry.target), { recursive: true });
  await writeFile(entry.target, transpiled, "utf8");
}

async function prepareRuntime() {
  await rm(runtimeRoot, { recursive: true, force: true });
  await mkdir(runtimeRoot, { recursive: true });
  await writeFile(
    path.join(runtimeRoot, "package.json"),
    JSON.stringify({ type: "module" }, null, 2),
    "utf8",
  );
  await Promise.all(sourceFiles.map(transpileFile));
  await writeFile(
    path.join(runtimeRoot, "lib", "secondme.js"),
    [
      "export async function getAccessToken() { return null; }",
      "export function getSecondMeConfig() {",
      '  return { apiBaseUrl: process.env.SECONDME_API_BASE_URL ?? "https://api.mindverse.com/gate/lab" };',
      "}",
      "",
    ].join("\n"),
    "utf8",
  );
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function extractIssues(record) {
  const issues = [];
  if (!record.reachedPreviewGenerated) issues.push("未到达 preview_generated");
  if (!record.reachedHandoffReady) issues.push("未到达 handoff_ready");
  if (!record.reachedHandoff) issues.push("未产出 lab_handoff");
  return issues;
}

async function main() {
  await prepareRuntime();

  const workflowModule = await import(
    pathToFileURL(path.join(runtimeRoot, "lib", "intake", "workflow.js")).href
  );
  const typesModule = await import(
    pathToFileURL(path.join(runtimeRoot, "lib", "intake", "types.js")).href
  );
  const collabModule = await import(
    pathToFileURL(path.join(runtimeRoot, "lib", "intake", "collaboration.js")).href
  );

  const { runIntakeWorkflow } = workflowModule;
  const { createEmptyState } = typesModule;
  const { buildCollaborationPanel, updateProjectCollaborationRecord } = collabModule;

  const results = [];

  for (const scenario of scenarios) {
    const sessionId = `diy_e2e_25_${scenario.name}`;
    let state = createEmptyState();
    let history = [];
    let projectRecord = undefined;
    let reachedPreviewGenerated = false;
    let reachedHandoffReady = false;
    let reachedPreviewDraft = false;
    let reachedHandoff = false;
    const turns = [];

    for (const userMessage of scenario.steps) {
      const output = await runIntakeWorkflow(sessionId, userMessage, state, history);
      const panel = await buildCollaborationPanel(output);
      const now = Date.now();
      projectRecord = updateProjectCollaborationRecord({
        sessionId,
        panel,
        previous: projectRecord,
        now,
      });

      history = [
        ...history,
        { role: "user", content: userMessage, timestamp: now },
        { role: "assistant", content: output.customer_reply, timestamp: now + 1 },
      ].slice(-16);
      state = output.state;

      if (output.state.workflow_state === "preview_generated") reachedPreviewGenerated = true;
      if (output.state.workflow_state === "handoff_ready") reachedHandoffReady = true;
      if (output.preview_input_draft) reachedPreviewDraft = true;
      if (output.lab_handoff) reachedHandoff = true;

      turns.push({
        user: userMessage,
        assistant: output.customer_reply,
        workflow_state: output.state.workflow_state,
        next_action: output.next_action,
        unknowns: output.unknowns,
        panel_stage: panel.stage,
      });
    }

    const finalTurn = turns[turns.length - 1];
    const record = {
      scenario: scenario.name,
      title: scenario.title,
      reachedPreviewGenerated,
      reachedHandoffReady,
      reachedPreviewDraft,
      reachedHandoff,
      finalState: finalTurn?.workflow_state ?? null,
      finalUnknowns: finalTurn?.unknowns ?? [],
      finalPanelStage: finalTurn?.panel_stage ?? null,
      timelineCount: projectRecord?.timeline.length ?? 0,
      turns,
    };

    results.push({
      ...record,
      issues: extractIssues(record),
    });
  }

  const stamp = nowStamp();
  await mkdir(reportRoot, { recursive: true });
  const mdPath = path.join(reportRoot, `diy-agent-25-cases-${stamp}.md`);
  const latestMdPath = path.join(reportRoot, "diy-agent-25-cases-latest.md");

  const lines = [];
  lines.push("# DIY Agent 25 用例测试报告");
  lines.push("");
  lines.push(`- 生成时间: ${new Date().toISOString()}`);
  lines.push(`- 用例数量: ${results.length}`);
  lines.push("");
  lines.push("## 总览");
  for (const item of results) {
    const status = item.issues.length ? "WARN" : "PASS";
    lines.push(
      `- [${status}] ${item.title} | final=${item.finalState} | preview=${item.reachedPreviewGenerated} | handoffReady=${item.reachedHandoffReady} | handoff=${item.reachedHandoff}`,
    );
    if (item.issues.length) lines.push(`  - 问题: ${item.issues.join("；")}`);
  }
  lines.push("");
  lines.push("## 用例详情（含对话框内容）");

  for (const item of results) {
    lines.push(`### ${item.title}（${item.scenario}）`);
    lines.push(`- 最终状态: ${item.finalState}`);
    lines.push(`- 最终未知项: ${item.finalUnknowns.join("、") || "无"}`);
    lines.push(`- 面板阶段: ${item.finalPanelStage}`);
    lines.push(`- 时间线事件数: ${item.timelineCount}`);
    lines.push(`- 对话记录:`);
    item.turns.forEach((turn, index) => {
      lines.push(`  ${index + 1}. USER: ${turn.user}`);
      lines.push(`     BOT : ${turn.assistant}`);
      lines.push(`     STATE: ${turn.workflow_state} | NEXT: ${turn.next_action} | UNKNOWNS: ${turn.unknowns.join("、") || "无"}`);
    });
    lines.push("");
  }

  const markdown = lines.join("\n");
  await writeFile(mdPath, markdown, "utf8");
  await writeFile(latestMdPath, markdown, "utf8");

  console.log(`Saved MD report: ${mdPath}`);
  console.log(`Updated latest: ${latestMdPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

