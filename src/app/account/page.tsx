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

export default function AccountPage() {
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
      setMessage("保存成功");
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
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">账户信息管理</h1>
            <p className="mt-1 text-sm text-slate-600">
              基于 Second Me 用户身份，维护一个轻量账户档案（用于 Demo 展示与项目协作）。
            </p>
          </div>
          <a
            href="/"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            返回主界面
          </a>
        </div>

        {loading ? <p className="mt-6 text-sm text-slate-500">正在加载账户信息...</p> : null}
        {error ? <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}

        {!loading && !error ? (
          <div className="mt-6 space-y-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div>Second Me 用户 ID: {userId || "-"}</div>
              <div className="mt-1">
                最近更新: {updatedAt ? new Date(updatedAt).toLocaleString("zh-CN") : "暂无"}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">显示名称</span>
                <input
                  value={profile.display_name}
                  onChange={(e) => updateField("display_name", e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">邮箱</span>
                <input
                  value={profile.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">电话</span>
                <input
                  value={profile.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">公司</span>
                <input
                  value={profile.company}
                  onChange={(e) => updateField("company", e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">岗位</span>
                <input
                  value={profile.role_title}
                  onChange={(e) => updateField("role_title", e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">时区</span>
                <input
                  value={profile.timezone}
                  onChange={(e) => updateField("timezone", e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">备注</span>
              <textarea
                value={profile.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={4}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>

            <div className="flex justify-end">
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存档案"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
