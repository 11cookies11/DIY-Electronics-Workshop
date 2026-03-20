import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const projectRoot = process.cwd();
const runtimeRoot = path.join(projectRoot, ".where", "diy-agent-e2e-30-runtime");
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
    name: "smart_plant_watering_hub",
    title: "智能浇花控制器",
    steps: [
      "我想做一个阳台用的智能浇花控制器。",
      "要按土壤湿度自动浇水，也能手动一键浇水。",
      "正面小屏幕，下面两个按键。",
      "Type-C 供电，内置电池断电应急。",
      "先出一版预览。",
      "继续推进，给我 handoff。",
    ],
  },
  {
    name: "aquarium_temp_keeper",
    title: "鱼缸温控终端",
    steps: [
      "我想做一个鱼缸温控终端。",
      "主要看水温并控制加热棒开关。",
      "要一个旋钮和确认键，屏幕显示温度。",
      "外接供电，最好也支持电池备用。",
      "先看预览。",
      "继续推进交接。",
    ],
  },
  {
    name: "parcel_pickup_notifier",
    title: "快递取件提醒器",
    steps: [
      "我想做个快递到件提醒器放在门口。",
      "收到通知后亮灯并蜂鸣提醒。",
      "有小屏显示取件码，侧边一个静音键。",
      "Type-C 供电。",
      "先生成预览。",
      "继续给我 handoff。",
    ],
  },
  {
    name: "baby_room_guard",
    title: "婴儿房环境监护器",
    steps: [
      "想做婴儿房环境监护器。",
      "要监测温湿度和噪声，异常就提醒。",
      "触屏为主，保留一个实体按键。",
      "可充电电池。",
      "先出预览。",
      "继续推进交接。",
    ],
  },
  {
    name: "balcony_clothes_panel",
    title: "阳台晾衣控制面板",
    steps: [
      "我想做一个阳台晾衣控制面板。",
      "控制升降和照明，显示当前状态。",
      "触控滑条加两个按键。",
      "外接供电。",
      "先看一版预览。",
      "继续生成 handoff。",
    ],
  },
  {
    name: "car_tire_pressure_display",
    title: "车载胎压显示终端",
    steps: [
      "想做车载胎压显示终端。",
      "能显示四轮胎压并超限告警。",
      "小屏幕加一个确认键。",
      "内置电池，Type-C 充电。",
      "先看预览。",
      "继续推进 handoff。",
    ],
  },
  {
    name: "fridge_inventory_screen",
    title: "冰箱食材库存屏",
    steps: [
      "我想做冰箱食材库存屏。",
      "记录食材到期时间并提醒。",
      "触屏操作，保留返回键。",
      "外接供电。",
      "先出预览。",
      "继续做交接。",
    ],
  },
  {
    name: "posture_reminder_desk",
    title: "工位坐姿提醒器",
    steps: [
      "我想做一个工位坐姿提醒器。",
      "久坐会振动提醒，统计每天专注时长。",
      "小屏+旋钮交互。",
      "Type-C 供电。",
      "先生成预览。",
      "继续推进 handoff。",
    ],
  },
  {
    name: "meeting_timer_cube",
    title: "会议计时方块",
    steps: [
      "想做会议计时方块，放会议室桌上。",
      "可设置 15/30/45 分钟计时并提醒。",
      "四面显示，顶部一个按键。",
      "可充电。",
      "先看预览。",
      "继续交接。",
    ],
  },
  {
    name: "library_seat_status_tag",
    title: "图书馆座位状态牌",
    steps: [
      "想做图书馆座位状态牌。",
      "显示空闲、短暂离开、占用状态。",
      "小屏幕加确认键。",
      "电池供电。",
      "先出预览。",
      "继续 handoff。",
    ],
  },
  {
    name: "pet_water_monitor",
    title: "宠物饮水机监测器",
    steps: [
      "我想做宠物饮水机监测器。",
      "监测水位和滤芯寿命，手机可看状态。",
      "屏幕加两个按键。",
      "外接供电，断电电池应急。",
      "先出预览。",
      "继续推进交接。",
    ],
  },
  {
    name: "window_door_alarm",
    title: "门窗安防提示器",
    steps: [
      "我想做门窗安防提示器。",
      "门窗异常开启会亮灯和蜂鸣。",
      "正面状态灯条，侧边静音键。",
      "电池供电。",
      "先看预览。",
      "继续 handoff。",
    ],
  },
  {
    name: "shop_cashier_subscreen",
    title: "门店收银副屏",
    steps: [
      "想做一个门店收银副屏。",
      "显示订单金额和支付状态。",
      "触屏交互，保留返回键。",
      "外接供电。",
      "先生成预览。",
      "继续做交接。",
    ],
  },
  {
    name: "dorm_power_cut_notifier",
    title: "宿舍断电提醒器",
    steps: [
      "我想做宿舍断电提醒器。",
      "断电时蜂鸣并记录时间。",
      "小屏显示，实体按键确认。",
      "电池供电。",
      "先出预览。",
      "继续推进 handoff。",
    ],
  },
  {
    name: "treadmill_knob_controller",
    title: "跑步机旋钮控制器",
    steps: [
      "想做跑步机旋钮控制器。",
      "可快速调节速度和坡度。",
      "主旋钮+确认按键，屏幕显示参数。",
      "外接供电。",
      "先看预览。",
      "继续交接。",
    ],
  },
  {
    name: "smart_aroma_diffuser",
    title: "智能香薰机控制端",
    steps: [
      "我想做智能香薰机控制端。",
      "定时喷香，显示剩余液量。",
      "触摸按键加状态屏。",
      "Type-C 供电。",
      "先生成预览。",
      "继续 handoff。",
    ],
  },
  {
    name: "gym_counting_device",
    title: "健身计次器",
    steps: [
      "想做健身计次器。",
      "记录每组次数和休息倒计时。",
      "屏幕加两个按键。",
      "电池供电。",
      "先看预览。",
      "继续推进交接。",
    ],
  },
  {
    name: "expo_visitor_counter",
    title: "展会访客计数器",
    steps: [
      "我想做展会访客计数器。",
      "统计入场人数并实时显示。",
      "小屏+确认键。",
      "外接供电。",
      "先出一版预览。",
      "继续生成 handoff。",
    ],
  },
  {
    name: "warehouse_temp_alarm_light",
    title: "仓库温湿度告警灯",
    steps: [
      "想做仓库温湿度告警灯。",
      "超阈值时红灯闪烁并蜂鸣。",
      "前面有小屏，侧边按键消音。",
      "Type-C 供电。",
      "先看预览。",
      "继续交接。",
    ],
  },
  {
    name: "farm_soil_monitor_terminal",
    title: "农田土壤监测终端",
    steps: [
      "我想做农田土壤监测终端。",
      "监测湿度、温度和电导率。",
      "屏幕显示为主，保留确认键。",
      "太阳能+电池供电。",
      "先生成预览。",
      "继续 handoff。",
    ],
  },
  {
    name: "curtain_remote_pad",
    title: "窗帘遥控面板",
    steps: [
      "想做一个窗帘遥控面板。",
      "控制开合比例和定时开关。",
      "触屏加一个实体电源键。",
      "可充电。",
      "先看预览。",
      "继续推进交接。",
    ],
  },
  {
    name: "projector_screen_controller",
    title: "投影幕布控制器",
    steps: [
      "我想做投影幕布控制器。",
      "一键升降并显示当前状态。",
      "两个按键和小屏。",
      "外接供电。",
      "先出预览。",
      "继续 handoff。",
    ],
  },
  {
    name: "sleep_breath_monitor_box",
    title: "睡眠呼吸监测盒",
    steps: [
      "想做睡眠呼吸监测盒。",
      "夜间监测呼吸频率并异常提醒。",
      "小屏幕，顶部确认键。",
      "电池供电。",
      "先生成预览。",
      "继续交接。",
    ],
  },
  {
    name: "elderly_emergency_caller",
    title: "老人紧急呼叫器",
    steps: [
      "想做老人紧急呼叫器。",
      "一键求助并记录告警时间。",
      "大按键+状态灯，屏幕可选。",
      "电池供电。",
      "先看预览。",
      "继续 handoff。",
    ],
  },
  {
    name: "ev_battery_display",
    title: "电动车电量显示器",
    steps: [
      "我想做电动车电量显示器。",
      "显示剩余电量和续航估算。",
      "屏幕加两个按键。",
      "外接供电。",
      "先出预览。",
      "继续推进交接。",
    ],
  },
  {
    name: "solar_charge_dashboard",
    title: "太阳能充电状态仪",
    steps: [
      "想做太阳能充电状态仪。",
      "显示输入功率和电池状态。",
      "小屏幕，确认按键。",
      "外接供电。",
      "先看预览。",
      "继续 handoff。",
    ],
  },
  {
    name: "kitchen_gas_alarm_terminal",
    title: "厨房燃气告警终端",
    steps: [
      "我想做厨房燃气告警终端。",
      "检测异常浓度时声光报警。",
      "前面状态屏，侧边静音键。",
      "外接供电。",
      "先生成预览。",
      "继续交接。",
    ],
  },
  {
    name: "indoor_light_panel",
    title: "室内光照调节面板",
    steps: [
      "想做室内光照调节面板。",
      "可调亮度和色温，保存场景。",
      "触控滑条+确认键。",
      "外接供电。",
      "先看预览。",
      "继续 handoff。",
    ],
  },
  {
    name: "child_focus_reminder",
    title: "儿童专注提醒器",
    steps: [
      "我想做儿童专注提醒器。",
      "学习超时会提醒休息。",
      "屏幕和两个按键操作。",
      "电池供电。",
      "先出预览。",
      "继续推进交接。",
    ],
  },
  {
    name: "parking_slot_status_board",
    title: "停车位占用提示牌",
    steps: [
      "想做停车位占用提示牌。",
      "检测车位占用并实时显示。",
      "状态灯+小屏，保留确认键。",
      "外接供电。",
      "先看预览。",
      "继续 handoff。",
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

function buildMarkdownReport(summary) {
  const lines = [];
  lines.push("# DIY Agent 30 用例测试报告（全新场景）");
  lines.push("");
  lines.push(`- 生成时间: ${new Date().toISOString()}`);
  lines.push(`- 用例数量: ${summary.length}`);
  lines.push("");
  lines.push("## 总览");
  for (const item of summary) {
    const status = item.issues.length ? "WARN" : "PASS";
    lines.push(
      `- [${status}] ${item.title} | final=${item.finalState} | preview=${item.reachedPreviewGenerated} | handoffReady=${item.reachedHandoffReady} | handoff=${item.reachedHandoff}`,
    );
    if (item.issues.length) {
      lines.push(`  - 问题: ${item.issues.join("；")}`);
    }
  }

  lines.push("");
  lines.push("## 用例详情（含对话）");
  for (const item of summary) {
    lines.push(`### ${item.title}（${item.name}）`);
    lines.push(`- 最终状态: ${item.finalState}`);
    lines.push(`- 最终未知项: ${item.finalUnknowns.length ? item.finalUnknowns.join("、") : "无"}`);
    lines.push(`- 记录轮次: ${item.turns.length}`);
    lines.push("- 对话记录:");
    item.turns.forEach((turn, idx) => {
      lines.push(
        `  ${idx + 1}. USER: ${turn.user}  BOT: ${turn.assistant}  STATE: ${turn.workflow_state} | NEXT: ${turn.next_action} | UNKNOWNS: ${
          turn.unknowns.length ? turn.unknowns.join("、") : "无"
        }`,
      );
    });
    if (item.issues.length) {
      lines.push(`- 问题: ${item.issues.join("；")}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  await prepareRuntime();

  const workflowModule = await import(
    pathToFileURL(path.join(runtimeRoot, "lib", "intake", "workflow.js")).href
  );
  const typesModule = await import(
    pathToFileURL(path.join(runtimeRoot, "lib", "intake", "types.js")).href
  );

  const { runIntakeWorkflow } = workflowModule;
  const { createEmptyState } = typesModule;

  const results = [];

  for (const scenario of scenarios) {
    let state = createEmptyState();
    let history = [];
    const turns = [];

    let reachedPreviewGenerated = false;
    let reachedHandoffReady = false;
    let reachedHandoff = false;

    for (const userMessage of scenario.steps) {
      const output = await runIntakeWorkflow(
        `demo-30-${scenario.name}`,
        userMessage,
        state,
        history,
      );

      turns.push({
        user: userMessage,
        assistant: output.customer_reply,
        workflow_state: output.state.workflow_state,
        next_action: output.next_action,
        unknowns: output.unknowns ?? [],
      });

      if (output.state.workflow_state === "preview_generated") reachedPreviewGenerated = true;
      if (output.state.workflow_state === "handoff_ready") reachedHandoffReady = true;
      if (output.lab_handoff) reachedHandoff = true;

      history = [
        ...history,
        { role: "user", content: userMessage },
        { role: "assistant", content: output.customer_reply },
      ];
      state = output.state;
    }

    const record = {
      name: scenario.name,
      title: scenario.title,
      reachedPreviewGenerated,
      reachedHandoffReady,
      reachedHandoff,
      finalState: state.workflow_state,
      finalUnknowns: state.unknowns ?? [],
      turns,
    };
    results.push({ ...record, issues: extractIssues(record) });
  }

  const stamp = nowStamp();
  await mkdir(reportRoot, { recursive: true });
  const reportPath = path.join(reportRoot, `diy-agent-30-cases-${stamp}.md`);
  const latestPath = path.join(reportRoot, "diy-agent-30-cases-latest.md");
  const markdown = buildMarkdownReport(results);
  await writeFile(reportPath, markdown, "utf8");
  await writeFile(latestPath, markdown, "utf8");

  console.log(`Saved MD report: ${reportPath}`);
  console.log(`Updated latest: ${latestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
