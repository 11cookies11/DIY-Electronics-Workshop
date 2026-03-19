import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const projectRoot = process.cwd();
const runtimeRoot = path.join(projectRoot, ".where", "repro-preview-runtime");

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
  const typesModule = await import(
    pathToFileURL(path.join(runtimeRoot, "lib", "intake", "types.js")).href
  );

  const { runIntakeWorkflow } = workflowModule;
  const { createEmptyState } = typesModule;

  const steps = [
    "你好，我想做一个遥控器",
    "我想控制家里的电器",
    "空调",
    "我选择触摸",
    "可充电的",
    "我愿意",
    "我愿意",
  ];

  let state = createEmptyState();
  let history = [];
  const rows = [];

  for (const step of steps) {
    const output = await runIntakeWorkflow("preview-consent-repro", step, state, history);
    rows.push({
      user: step,
      workflow_state: output.state.workflow_state,
      next_action: output.next_action,
      has_preview_draft: Boolean(output.preview_input_draft),
      has_handoff: Boolean(output.lab_handoff),
      reply: output.customer_reply,
    });

    const now = Date.now();
    history = [
      ...history,
      { role: "user", content: step, timestamp: now },
      { role: "assistant", content: output.customer_reply, timestamp: now + 1 },
    ].slice(-16);
    state = output.state;
  }

  console.log(JSON.stringify(rows, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
