"use client";

export function ConnectButton() {
  return (
    <a
      href="/api/auth/login"
      className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)]"
    >
      连接 SecondMe
    </a>
  );
}
