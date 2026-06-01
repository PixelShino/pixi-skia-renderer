import type { CanvasKit } from "canvaskit-wasm";
import { hasPdfBackend } from "./types";

/** Стоковый canvaskit-wasm с CDN (full-сборка), без PDF backend. */
const STOCK_BASE = "https://unpkg.com/canvaskit-wasm@0.41.1/bin/full";
/** Локальная кастомная сборка с PDF backend (см. scripts/canvaskit-pdf). */
const LOCAL_BASE = "/canvaskit";

export interface LoadedCanvasKit {
  ck: CanvasKit;
  /** Доступен ли PDF backend (true только для нашей сборки). */
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

/**
 * Загружает CanvasKit, предпочитая локальную сборку с PDF backend.
 *
 * `canvaskit.js` грузим через тег `<script>` (а не bundler-импортом npm-пакета:
 * его JS содержит Node-ветку `require("fs")`, которую браузерный сборщик не
 * разрешает). Источник:
 *   1. если `NEXT_PUBLIC_USE_LOCAL_CANVASKIT=1` — наша сборка из
 *      `public/canvaskit/` (с `MakePDFDocument`) → экспорт PDF работает;
 *   2. иначе CDN — стоковая сборка, сцена рисуется, но PDF недоступен.
 *
 * Флаг (а не авто-проба запросом) — чтобы не плодить 404 в консоли, пока
 * локальная сборка ещё не положена.
 */
export async function loadCanvasKit(): Promise<LoadedCanvasKit> {
  const useLocal = process.env.NEXT_PUBLIC_USE_LOCAL_CANVASKIT === "1";
  const base = useLocal ? LOCAL_BASE : STOCK_BASE;

  await injectScript(`${base}/canvaskit.js`);
  const init = window.CanvasKitInit;
  if (!init) throw new Error("CanvasKitInit не найден после загрузки canvaskit.js");

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
