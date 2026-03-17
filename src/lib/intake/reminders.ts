import type { ConfirmedRequirement } from "./types";

export type ReminderBundle = {
  reminders: string[];
  riskAlerts: string[];
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function hasValue(value?: string | string[]) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

export function buildReminderBundle(confirmed: ConfirmedRequirement) {
  const reminders: string[] = [];
  const riskAlerts: string[] = [];

  if (confirmed.device_type === "红外遥控器") {
    if (!hasValue(confirmed.power)) {
      reminders.push("遥控器一般要尽快定供电方式，不然续航和厚度很难一起判断。");
    }
    if (confirmed.screen && !hasValue(confirmed.controls)) {
      reminders.push("带屏幕的遥控器也最好补一句主交互是不是按键配合触屏，不然操作手感会有点悬。");
    }
    if (!confirmed.core_features?.includes("红外控制")) {
      riskAlerts.push("如果它是遥控器但还没确认红外控制能力，后面做 3D 草案容易偏成普通手持设备。");
    }
  }

  if (confirmed.device_type === "智能手表") {
    if (!hasValue(confirmed.power)) {
      reminders.push("手表类设备最好早点确认电池和充电方式，这会直接影响厚度和内部结构。");
    }
    if (!hasValue(confirmed.screen) && !hasValue(confirmed.controls)) {
      reminders.push("手表至少要先定主交互：触屏、按键，或者两者搭配。");
    }
    if (confirmed.connectivity?.includes("Wi-Fi") && !confirmed.connectivity?.includes("蓝牙")) {
      riskAlerts.push("手表只提 Wi‑Fi 不提蓝牙会有点奇怪，除非它不打算和手机做近距连接。");
    }
  }

  if (confirmed.device_type === "桌面设备") {
    if (!hasValue(confirmed.ports) && !hasValue(confirmed.connectivity)) {
      reminders.push("桌面设备通常会尽早确认接口或连接方式，不然交互链路会太空。");
    }
    if (confirmed.power?.includes("电池供电") && !confirmed.use_case) {
      riskAlerts.push("桌面设备如果还没说场景却默认走电池供电，后面可能会和体积、续航预期打架。");
    }
  }

  if (confirmed.connectivity?.includes("Wi-Fi") && !hasValue(confirmed.power)) {
    reminders.push("带 Wi‑Fi 的设备最好补一下供电方式，我这边才能更稳地判断功耗方向。");
  }

  if (confirmed.screen && !confirmed.size) {
    reminders.push("带屏幕的话，哪怕先给一个大致尺寸范围，后面预览也会更像真实设备。");
  }

  if (hasValue(confirmed.power) && confirmed.power?.includes("电池供电") && !hasValue(confirmed.ports)) {
    reminders.push("如果走电池供电，也可以顺手说一下充电口或充电方式，这样结构会更完整。");
  }

  if (confirmed.screen && confirmed.device_type === "红外遥控器" && !hasValue(confirmed.power)) {
    riskAlerts.push("带屏幕的遥控器如果没说供电，做出来很容易只是看上去完整，实际续航会站不住。");
  }

  return {
    reminders: unique(reminders).slice(0, 3),
    riskAlerts: unique(riskAlerts).slice(0, 3),
  } satisfies ReminderBundle;
}
