import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecondMe Hello World",
  description: "A minimal hello world app for SecondMe exploration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const rawScale = Number(process.env.NEXT_PUBLIC_DESKTOP_UI_SCALE ?? "0.8");
  const desktopScale =
    Number.isFinite(rawScale) && rawScale > 0.5 && rawScale <= 1 ? rawScale : 0.8;

  return (
    <html lang="zh-CN">
      <body>
        <div
          className="app-zoom-shell"
          style={
            {
              "--desktop-ui-scale": String(desktopScale),
            } as React.CSSProperties
          }
        >
          {children}
        </div>
      </body>
    </html>
  );
}
