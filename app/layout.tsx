import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pixi Skia Bridge",
  description: "Rendering PIXI.Container via Skia with PDF export",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="bg-neutral-900 text-neutral-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
