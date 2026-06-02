import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "pixi → skia · мост рендера",
  description:
    "Рендер дерева PIXI.Container средствами Skia (CanvasKit) с экспортом сцены в векторный PDF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
