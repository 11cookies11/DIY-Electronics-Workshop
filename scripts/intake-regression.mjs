const baseUrl = process.env.INTAKE_BASE_URL ?? "http://127.0.0.1:3000";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function postIntake(sessionId, message) {
  const response = await fetch(`${baseUrl}/api/intake/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      sessionId,
      message,
    }),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function runScenario(name, steps, verify) {
  const sessionId = `regression_${name}_${Date.now()}`;
  let lastPayload = null;

  for (const step of steps) {
    lastPayload = await postIntake(sessionId, step);
  }

  assert(lastPayload, `${name}: no payload returned`);
  verify(lastPayload);
  console.log(`[pass] ${name}`);
}

await runScenario(
  "correction_preview",
  [
    "我想做一个红外万能遥控器",
    "控制电视和空调",
    "不是电视，是投影仪",
    "用触屏，保留按钮",
    "放在屏幕旁边",
    "内置电池，Type-C",
    "主要放家里用，偶尔拿起来",
    "那给我生成吧",
  ],
  (payload) => {
    assert(payload.state.workflow_state === "preview_generated", "correction_preview: preview not generated");
    assert(
      Array.isArray(payload.confirmed.target_devices) &&
        payload.confirmed.target_devices.includes("投影仪"),
      "correction_preview: target device did not switch to 投影仪",
    );
    assert(
      !payload.confirmed.target_devices.includes("电视"),
      "correction_preview: old target device 电视 should have been replaced",
    );
  },
);

await runScenario(
  "preview_mapping",
  [
    "我想做一个红外万能遥控器",
    "电视空调和智能灯这些都要",
    "大部分操作都靠触屏",
    "保留电源音量切换这些物理按键",
    "放在屏幕旁边",
    "内置电池，用Type-C",
    "放在茶几上，偶尔拿起来",
    "那给我生成吧",
  ],
  (payload) => {
    assert(payload.preview_input_draft, "preview_mapping: missing preview draft");
    assert(
      payload.preview_input_draft.input.board?.grid?.cols === 7,
      "preview_mapping: board grid cols should reflect side-by-side layout",
    );
    assert(
      payload.preview_input_draft.input.shellSize?.width >= 60,
      "preview_mapping: shell width should be widened by layout mapping",
    );
    assert(
      Array.isArray(payload.confirmed.button_preferences) &&
        payload.confirmed.button_preferences.length >= 3,
      "preview_mapping: button preferences were not retained",
    );
  },
);

await runScenario(
  "handoff_flow",
  [
    "我想做一个红外万能遥控器",
    "控制电视和空调",
    "用触屏，保留按钮",
    "内置电池，用Type-C",
    "主要放家里用",
    "帮我整理交接单",
  ],
  (payload) => {
    assert(payload.lab_handoff, "handoff_flow: missing lab handoff");
    assert(
      payload.next_action === "prepare_handoff" || payload.state.workflow_state === "handoff_ready",
      "handoff_flow: handoff state not reached",
    );
  },
);

console.log("All intake regression scenarios passed.");
