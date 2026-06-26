import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "認知書アプリ v0.1 Web Preview",
  description: "Character OS Lite付きの認知書アプリWebプロトタイプ"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>{children}</body>
    </html>
  );
}
