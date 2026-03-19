import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const projectRoot = process.cwd();
const runtimeRoot = path.join(projectRoot, ".where", "intake-probe-runtime");

const sourceFiles = [
  ...[
    "conversation-base.ts",
    "knowledge-config.ts",
    "knowledge.ts",
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
    name: "smalltalk_to_requirement",
    steps: [
      "你好呀",
      "你们这边主要能帮我做什么",
      "我想做一个手持设备",
      "主要放家里用，偶尔拿起来",
    ],
    assertions: [
      {
        step: 1,
        includes: ["先把你的设备想法接住", "3D 结构草案"],
      },
      {
        step: 2,
        focus: "使用场景",
      },
    ],
  },
  {
    name: "correction_then_preview_ready",
    steps: [
      "我想做一个红外万能遥控器",
      "控制电视和空调",
      "不是电视，是投影仪",
      "用触屏，保留按钮",
      "内置电池，用Type-C",
    ],
    assertions: [
      {
        step: 1,
        focus: "主要交互方式",
      },
      {
        step: 4,
        state: "preview_ready",
        includes: ["3D 预览"],
      },
    ],
  },
  {
    name: "gratitude_finish",
    steps: [
      "我想做一个手持设备",
      "主要放家里用",
      "内置电池，用Type-C",
      "谢谢你",
    ],
    assertions: [
      {
        step: 3,
        includes: ["好呀", "核心功能"],
      },
    ],
  },
  {
    name: "vague_then_offer_preview",
    steps: [
      "我想做个小设备，还没完全想好",
      "更偏手持，最好有个屏幕",
      "主要是家里用",
      "内置电池",
    ],
    assertions: [
      {
        step: 1,
        focus: "使用场景",
      },
      {
        step: 3,
        state: "preview_ready",
        includes: ["3D 预览"],
      },
    ],
  },
  {
    name: "preview_then_offer_handoff",
    steps: [
      "我想做一个红外万能遥控器",
      "控制电视和空调",
      "用触屏，保留按钮",
      "内置电池，用Type-C",
      "先出一版预览",
      "继续推进",
    ],
    assertions: [
      {
        step: 4,
        state: "preview_generated",
      },
      {
        step: 5,
        state: "handoff_ready",
        includes: ["handoff", "交接"],
      },
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
      '}',
      "",
    ].join("\n"),
    "utf8",
  );
}

function summarizeTurn(payload) {
  return {
    reply: payload.customer_reply,
    state: payload.state?.workflow_state,
    next: payload.next_action,
    focus: payload.debug?.single_focus ?? null,
    memory: payload.debug?.memory_mode ?? null,
    unknowns: payload.unknowns ?? [],
  };
}

function assertScenarioTurn(result, assertion, scenarioName) {
  const summary = summarizeTurn(result);

  if (assertion.state && summary.state !== assertion.state) {
    throw new Error(
      `${scenarioName}: expected state ${assertion.state} at step ${assertion.step}, got ${summary.state}`,
    );
  }

  if (assertion.focus && summary.focus !== assertion.focus) {
    throw new Error(
      `${scenarioName}: expected focus ${assertion.focus} at step ${assertion.step}, got ${summary.focus}`,
    );
  }

  if (assertion.includes?.length) {
    for (const token of assertion.includes) {
      if (!summary.reply.includes(token)) {
        throw new Error(
          `${scenarioName}: expected reply to include "${token}" at step ${assertion.step}, got ${summary.reply}`,
        );
      }
    }
  }
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

  for (const scenario of scenarios) {
    let state = createEmptyState();
    let history = [];
    console.log(`\n=== ${scenario.name} ===`);
    const results = [];

    for (const step of scenario.steps) {
      const result = await runIntakeWorkflow(
        `probe_${scenario.name}`,
        step,
        state,
        history,
      );
      const now = Date.now();
      history = [
        ...history,
        { role: "user", content: step, timestamp: now },
        { role: "assistant", content: result.customer_reply, timestamp: now },
      ].slice(-16);
      state = result.state;
      results.push(result);

      console.log(`USER: ${step}`);
      console.log(`BOT : ${result.customer_reply}`);
      console.log(`DBG : ${JSON.stringify(summarizeTurn(result))}`);
    }

    for (const assertion of scenario.assertions ?? []) {
      assertScenarioTurn(results[assertion.step], assertion, scenario.name);
    }

    console.log(`[pass] ${scenario.name}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
