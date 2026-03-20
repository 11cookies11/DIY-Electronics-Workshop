import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const projectRoot = process.cwd();
const runtimeRoot = path.join(projectRoot, ".where", "demo-agents-runtime");

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

async function main() {
  await prepareRuntime();

  const workflowModule = await import(
    pathToFileURL(path.join(runtimeRoot, "lib", "intake", "workflow.js")).href
  );
  const collabModule = await import(
    pathToFileURL(path.join(runtimeRoot, "lib", "intake", "collaboration.js")).href
  );
  const typesModule = await import(
    pathToFileURL(path.join(runtimeRoot, "lib", "intake", "types.js")).href
  );

  const { runIntakeWorkflow } = workflowModule;
  const { buildCollaborationPanel, updateProjectCollaborationRecord } = collabModule;
  const { createEmptyState } = typesModule;

  const steps = [
    "我想做一个露营用智能灯。",
    "需要多档亮度和 SOS 闪烁。",
    "顶部旋钮，侧边按键，前面小屏。",
    "电池供电，Type-C 充电。",
    "先出预览。",
    "继续推进，给我 handoff。",
  ];

  let state = createEmptyState();
  let history = [];
  let projectRecord;

  console.log("=== DEMO: 多 Agent 协作展示 ===");
  for (const user of steps) {
    const output = await runIntakeWorkflow("demo-agents", user, state, history);
    const panel = await buildCollaborationPanel(output);
    projectRecord = updateProjectCollaborationRecord({
      sessionId: "demo-agents",
      panel,
      previous: projectRecord,
      now: Date.now(),
    });

    console.log(`\n[USER] ${user}`);
    console.log(`[ASSISTANT] ${output.customer_reply}`);
    console.log(`[STATE] ${output.state.workflow_state} | [NEXT] ${output.next_action}`);
    console.log(`[PANEL STAGE] ${panel.stage}`);
    console.log("[AGENT CHAT]");
    for (const turn of panel.conversation) {
      console.log(`- ${turn.from} -> ${turn.to.join(", ")}: ${turn.message}`);
    }

    history = [
      ...history,
      { role: "user", content: user, timestamp: Date.now() },
      { role: "assistant", content: output.customer_reply, timestamp: Date.now() + 1 },
    ].slice(-16);
    state = output.state;
  }

  if (projectRecord?.timeline?.length) {
    console.log("\n=== TIMELINE (last 6) ===");
    for (const event of projectRecord.timeline.slice(-6)) {
      console.log(`- ${event.stage} | ${event.from}: ${event.summary}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
