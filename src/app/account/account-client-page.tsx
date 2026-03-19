"use client";

import { useEffect, useState } from "react";

type AccountProfile = {
  display_name: string;
  email: string;
  phone: string;
  company: string;
  role_title: string;
  timezone: string;
  notes: string;
};

type AccountResponse = {
  ok: boolean;
  data?: {
    user_id: string;
    profile: AccountProfile;
    updated_at: number | null;
    source_user?: Record<string, unknown>;
  };
  error?: string;
};

const EMPTY_PROFILE: AccountProfile = {
  display_name: "",
  email: "",
  phone: "",
  company: "",
  role_title: "",
  timezone: "Asia/Shanghai",
  notes: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export function AccountClientPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [profile, setProfile] = useState<AccountProfile>(EMPTY_PROFILE);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/account/profile", { cache: "no-store" });
        const payload = (await response.json()) as AccountResponse;
        if (!response.ok || !payload.ok || !payload.data) {
          throw new Error(payload.error ?? "加载账户信息失败");
        }
        if (!mounted) return;
        setUserId(payload.data.user_id);
        setUpdatedAt(payload.data.updated_at);
        setProfile(payload.data.profile);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : "加载失败");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const payload = (await response.json()) as AccountResponse;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "保存失败");
      }
      setProfile(payload.data.profile);
      setUpdatedAt(payload.data.updated_at);
      setMessage("账户档案已更新");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof AccountProfile>(key: K, value: AccountProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#eef2f7_46%,_#e2e8f0_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-7 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Account Center
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                账户信息管理
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                统一维护项目联系人信息，供前台接待、采购协同与交付沟通复用。
              </p>
            </div>
            <a
              href="/"
              className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              返回主界面
            </a>
          </div>

          {loading ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              正在加载账户信息...
            </div>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}

          {!loading && !error ? (
            <div className="mt-6 space-y-6">
              <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500">
                      Second Me 用户 ID
                    </p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{userId || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500">最近更新</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {updatedAt ? new Date(updatedAt).toLocaleString("zh-CN") : "暂无"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-slate-900">基础信息</h2>
                <p className="mt-1 text-xs text-slate-500">
                  这些信息会用于项目立项、报价沟通与交付通知。
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-1.5 block text-slate-600">显示名称</span>
                    <input
                      value={profile.display_name}
                      onChange={(e) => updateField("display_name", e.target.value)}
                      className={inputClass}
                      placeholder="例如：王明 / Alice Wang"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1.5 block text-slate-600">邮箱</span>
                    <input
                      value={profile.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className={inputClass}
                      placeholder="用于接收项目通知与交付信息"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1.5 block text-slate-600">电话</span>
                    <input
                      value={profile.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      className={inputClass}
                      placeholder="用于紧急沟通"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1.5 block text-slate-600">公司</span>
                    <input
                      value={profile.company}
                      onChange={(e) => updateField("company", e.target.value)}
                      className={inputClass}
                      placeholder="可选"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1.5 block text-slate-600">岗位</span>
                    <input
                      value={profile.role_title}
                      onChange={(e) => updateField("role_title", e.target.value)}
                      className={inputClass}
                      placeholder="例如：产品经理 / 创始人"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1.5 block text-slate-600">时区</span>
                    <input
                      value={profile.timezone}
                      onChange={(e) => updateField("timezone", e.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>

                <label className="mt-4 block text-sm">
                  <span className="mb-1.5 block text-slate-600">备注</span>
                  <textarea
                    value={profile.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    rows={4}
                    className={inputClass}
                    placeholder="例如：偏好沟通时段、项目背景、重要约束等"
                  />
                </label>
              </section>

              <div className="flex justify-end">
                <button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="inline-flex h-11 items-center rounded-lg bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存档案"}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
