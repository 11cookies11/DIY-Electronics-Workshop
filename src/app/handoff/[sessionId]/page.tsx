import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionRecord } from "@/lib/intake/store";

type HandoffPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">
        {title}
      </h2>
      <div className="mt-4 text-sm text-slate-700">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <div className="text-slate-400">{label}</div>
      <div className="mt-1">{value || "未提供"}</div>
    </div>
  );
}

function List({
  items,
  emptyLabel = "未提供",
}: {
  items?: string[];
  emptyLabel?: string;
}) {
  if (!items?.length) {
    return <p className="text-slate-400">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="rounded-xl bg-slate-50 px-3 py-2">
          {item}
        </li>
      ))}
    </ul>
  );
}

export default async function HandoffPage({ params }: HandoffPageProps) {
  const { sessionId } = await params;
  const record = getSessionRecord(sessionId);

  if (!record?.lastOutput?.lab_handoff) {
    notFound();
  }

  const { lastOutput } = record;
  const handoff = lastOutput.lab_handoff!;
  const previewDraft = lastOutput.preview_input_draft;

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-slate-400">
              Lab Handoff
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              {handoff.project_type}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              {handoff.customer_summary}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm shadow-sm">
            <div className="text-slate-400">Session</div>
            <div className="mt-1 font-mono text-xs text-slate-700">{sessionId}</div>
            <div className="mt-4 text-slate-400">Next Step</div>
            <div className="mt-1 text-slate-700">{handoff.recommended_next_step}</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-6">
            <Section title="Confirmed Requirements">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="使用场景" value={handoff.use_case} />
                <Field label="目标用户" value={handoff.target_users} />
              </div>
              <div className="mt-5">
                <div className="mb-2 text-slate-400">控制对象</div>
                <List items={handoff.target_devices} emptyLabel="未指定控制设备" />
              </div>
              <div className="mt-5">
                <div className="mb-2 text-slate-400">核心功能</div>
                <List items={handoff.core_features} />
              </div>
            </Section>

            <Section title="Hardware Requirements">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="屏幕" value={handoff.hardware_requirements.screen} />
                <Field
                  label="屏幕偏好"
                  value={handoff.hardware_requirements.screen_size_preference}
                />
                <Field
                  label="布局"
                  value={handoff.hardware_requirements.interaction_layout}
                />
                <Field
                  label="供电"
                  value={handoff.hardware_requirements.power?.join("、")}
                />
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <div className="mb-2 text-slate-400">交互</div>
                  <List items={handoff.hardware_requirements.controls} />
                </div>
                <div>
                  <div className="mb-2 text-slate-400">按键偏好</div>
                  <List
                    items={handoff.hardware_requirements.button_preferences}
                    emptyLabel="未指定按键组"
                  />
                </div>
                <div>
                  <div className="mb-2 text-slate-400">传感器</div>
                  <List items={handoff.hardware_requirements.sensors} />
                </div>
                <div>
                  <div className="mb-2 text-slate-400">连接</div>
                  <List items={handoff.hardware_requirements.connectivity} />
                </div>
                <div>
                  <div className="mb-2 text-slate-400">接口</div>
                  <List items={handoff.hardware_requirements.ports} />
                </div>
              </div>
            </Section>

            <Section title="Constraints">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="尺寸" value={handoff.constraints.size} />
                <Field label="摆放位置" value={handoff.constraints.placement} />
                <Field label="移动方式" value={handoff.constraints.portability} />
                <Field label="预算" value={handoff.constraints.budget} />
                <Field label="时间" value={handoff.constraints.timeline} />
                <Field label="环境" value={handoff.constraints.environment} />
              </div>
            </Section>
          </div>

          <div className="space-y-6">
            <Section title="Preview Draft">
              {previewDraft ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-slate-400">Shell</div>
                    <div className="mt-1 font-mono text-xs">
                      {previewDraft.input.shell} / {previewDraft.input.shellSize.width} x{" "}
                      {previewDraft.input.shellSize.height} x{" "}
                      {previewDraft.input.shellSize.depth}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Modules</div>
                    <List
                      items={previewDraft.input.modules.map((item) =>
                        typeof item === "string" ? item : item.id,
                      )}
                    />
                  </div>
                  <div>
                    <div className="text-slate-400">Assumptions</div>
                    <List items={previewDraft.assumptions} />
                  </div>
                </div>
              ) : (
                <p className="text-slate-400">当前还没有可用的 3D preview 草案。</p>
              )}
            </Section>

            <Section title="Unknowns">
              <List items={handoff.unknowns} emptyLabel="当前无待确认项" />
            </Section>

            <Section title="Risks">
              <List items={handoff.risks} emptyLabel="当前无显著风险" />
            </Section>

            <Section title="References">
              <List items={handoff.references} emptyLabel="当前无参考资料" />
            </Section>

            <div className="flex gap-3">
              <Link
                href="/"
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm text-white transition hover:bg-slate-700"
              >
                返回实验室舞台
              </Link>
              <a
                href={`/api/intake/session?sessionId=${encodeURIComponent(sessionId)}`}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700 transition hover:bg-white"
              >
                查看原始 JSON
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
