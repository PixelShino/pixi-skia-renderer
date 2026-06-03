import type { CanvasKit } from "canvaskit-wasm";
import { hasPdfBackend } from "./types";

const STOCK_BASE = "https://unpkg.com/canvaskit-wasm@0.41.1/bin/full"; // CDN, без PDF
const LOCAL_BASE = "/canvaskit"; // сборка с PDF (scripts/canvaskit-pdf)

export interface LoadedCanvasKit {
  ck: CanvasKit;
  hasPdf: boolean;
}

type CanvasKitInitFn = (opts: {
  locateFile: (file: string) => string;
}) => Promise<CanvasKit>;

declare global {
  interface Window {
    CanvasKitInit?: CanvasKitInitFn;
  }
}

// canvaskit.js грузится через <script>, а не импортом npm-пакета: в его JS есть
// ветка require("fs") под Node, которую браузерный сборщик не пропускает.
// Источник выбирает флаг NEXT_PUBLIC_USE_LOCAL_CANVASKIT (=1 → локальная сборка с PDF).
export async function loadCanvasKit(): Promise<LoadedCanvasKit> {
  const useLocal = process.env.NEXT_PUBLIC_USE_LOCAL_CANVASKIT === "1";
  const base = useLocal ? LOCAL_BASE : STOCK_BASE;

  await injectScript(`${base}/canvaskit.js`);
  const init = window.CanvasKitInit;
  if (!init)
    throw new Error("CanvasKitInit не найден после загрузки canvaskit.js");

  const ck = await init({ locateFile: (file) => `${base}/${file}` });
  return { ck, hasPdf: hasPdfBackend(ck) };
}

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector("script[data-canvaskit]")) return resolve();
    const script = document.createElement("script");
    script.src = src;
    script.dataset.canvaskit = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Не удалось загрузить ${src}`));
    document.head.appendChild(script);
  });
}
