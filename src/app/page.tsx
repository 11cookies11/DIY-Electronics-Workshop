import { ConnectButton } from "@/app/components/connect-button";

type HomeProps = {
  searchParams?: Promise<{
    connected?: string;
    error?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = (await searchParams) ?? {};
  const connected = params.connected === "1";
  const error = params.error;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-3xl rounded-[32px] border border-black/5 bg-[var(--card)] p-10 shadow-[0_24px_80px_rgba(23,32,42,0.08)] backdrop-blur">
        <p className="text-sm uppercase tracking-[0.35em] text-[var(--accent)]">
          SecondMe Starter
        </p>
        <h1 className="mt-4 text-5xl font-semibold leading-tight">
          Hello, world.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-black/70">
          这是一个已经接好 SecondMe OAuth 骨架的起点。填入你的应用凭据后，就可以从这里发起登录、接收回调，并通过本地代理访问用户信息接口。
        </p>
        {connected ? (
          <p className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            已完成回调。下一步可以访问
            <code className="mx-1 rounded bg-white px-2 py-1 text-xs">
              /api/secondme/user/info
            </code>
            验证用户信息。
          </p>
        ) : null}
        {error ? (
          <p className="mt-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            连接失败：{error}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <span className="rounded-full bg-black px-4 py-2 text-sm text-white">
            Next.js
          </span>
          <span className="rounded-full bg-white px-4 py-2 text-sm text-black/75">
            TypeScript
          </span>
          <span className="rounded-full bg-white px-4 py-2 text-sm text-black/75">
            Tailwind CSS
          </span>
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <ConnectButton />
          <code className="rounded-full bg-white px-4 py-2 text-sm text-black/75">
            redirect_uri: /api/auth/callback
          </code>
        </div>
      </section>
    </main>
  );
}
