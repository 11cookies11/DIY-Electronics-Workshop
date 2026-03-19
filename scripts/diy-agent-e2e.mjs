import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const projectRoot = process.cwd();
const runtimeRoot = path.join(projectRoot, ".where", "diy-agent-e2e-runtime");
const reportRoot = path.join(projectRoot, "docs", "test-reports");

const sourceFiles = [
  ...[
    "archetypes.ts",
    "collaboration.ts",
    "conversation-base.ts",
    "knowledge-config.ts",
    "knowledge.ts",
    "llm-config.ts",
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
  await Promise.all(sourceFiles.map(transpileFile));
  await writeFile(
    path.join(runtimeRoot, "lib", "secondme.js"),
    [
      'export async function getAccessToken() { return null; }',
      'export function getSecondMeConfig() {',
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
  if (!record.reachedPreviewGenerated) {
    issues.push("未到达 preview_generated");
  }
  if (!record.reachedHandoffReady) {
    issues.push("未到达 handoff_ready");
  }
  if (!record.deliveryMessages.some((m) => m.includes("联系方式"))) {
    issues.push("交付 Agent 对话未明显索要联系方式");
  }
  if (!record.deliveryMessages.some((m) => m.includes("实时") || m.includes("里程碑"))) {
    issues.push("交付 Agent 对话未明显承诺实时进度同步");
  }
  if (record.finalUnknowns.length > 3) {
    issues.push(`未知项较多（${record.finalUnknowns.join("、")}）`);
  }
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
    const sessionId = `diy_e2e_${scenario.name}`;
    let state = createEmptyState();
    let history = [];
    let projectRecord = undefined;
    let reachedPreviewGenerated = false;
    let reachedHandoffReady = false;
    let reachedPreviewDraft = false;
    let reachedHandoff = false;
    const turns = [];
    const deliveryMessages = [];

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

      const deliveryTurns = panel.conversation.filter((x) => x.from === "delivery_lead");
      deliveryMessages.push(...deliveryTurns.map((x) => x.message));

      turns.push({
        user: userMessage,
        assistant: output.customer_reply,
        workflow_state: output.state.workflow_state,
        next_action: output.next_action,
        unknowns: output.unknowns,
        has_preview_draft: Boolean(output.preview_input_draft),
        has_lab_handoff: Boolean(output.lab_handoff),
        panel_stage: panel.stage,
        panel_conversation: panel.conversation,
      });
    }

    const finalTurn = turns[turns.length - 1];
    const scenarioResult = {
      scenario: scenario.name,
      title: scenario.title,
      reachedPreviewGenerated,
      reachedHandoffReady,
      reachedPreviewDraft,
      reachedHandoff,
      finalState: finalTurn?.workflow_state ?? null,
      finalUnknowns: finalTurn?.unknowns ?? [],
      finalPanelStage: finalTurn?.panel_stage ?? null,
      projectTimelineCount: projectRecord?.timeline.length ?? 0,
      deliveryMessages,
      turns,
    };
    results.push({
      ...scenarioResult,
      issues: extractIssues(scenarioResult),
    });
  }

  const stamp = nowStamp();
  await mkdir(reportRoot, { recursive: true });
  const jsonPath = path.join(reportRoot, `diy-agent-e2e-${stamp}.json`);
  const mdPath = path.join(reportRoot, `diy-agent-e2e-${stamp}.md`);

  await writeFile(jsonPath, JSON.stringify({ generated_at: new Date().toISOString(), results }, null, 2), "utf8");

  const lines = [];
  lines.push(`# DIY Agent E2E Test Report`);
  lines.push(``);
  lines.push(`- Generated At: ${new Date().toISOString()}`);
  lines.push(`- Scenarios: ${results.length}`);
  lines.push(``);
  lines.push(`## Summary`);
  for (const item of results) {
    const status = item.issues.length === 0 ? "PASS" : "WARN";
    lines.push(`- [${status}] ${item.title}: preview_generated=${item.reachedPreviewGenerated}, handoff_ready=${item.reachedHandoffReady}, handoff=${item.reachedHandoff}`);
    if (item.issues.length) {
      lines.push(`  Issues: ${item.issues.join("；")}`);
    }
  }
  lines.push(``);
  lines.push(`## Details`);
  for (const item of results) {
    lines.push(`### ${item.title} (${item.scenario})`);
    lines.push(`- Final State: ${item.finalState}`);
    lines.push(`- Final Unknowns: ${item.finalUnknowns.join("、") || "无"}`);
    lines.push(`- Panel Stage: ${item.finalPanelStage}`);
    lines.push(`- Timeline Events: ${item.projectTimelineCount}`);
    lines.push(`- Delivery Messages:`);
    for (const msg of item.deliveryMessages.slice(-3)) {
      lines.push(`  - ${msg}`);
    }
    lines.push(`- Conversation Turns:`);
    for (const turn of item.turns) {
      lines.push(`  - USER: ${turn.user}`);
      lines.push(`    BOT : ${turn.assistant}`);
      lines.push(`    STATE: ${turn.workflow_state}, NEXT: ${turn.next_action}`);
    }
    lines.push(``);
  }

  await writeFile(mdPath, lines.join("\n"), "utf8");

  console.log(`Saved JSON report: ${jsonPath}`);
  console.log(`Saved MD report: ${mdPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
