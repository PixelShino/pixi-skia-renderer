import type * as PIXI from "pixi.js-legacy";
import type { CanvasKit } from "canvaskit-wasm";
import { PixiSkiaRenderer } from "../pixi-skia-bridge";
import { hasPdfBackend } from "./types";

export class PdfBackendUnavailableError extends Error {
  constructor() {
    super(
      "PDF backend недоступен: текущий CanvasKit собран без PDF. " +
        "Соберите кастомный CanvasKit (scripts/canvaskit-pdf) и положите " +
        "артефакты в public/canvaskit/.",
    );
    this.name = "PdfBackendUnavailableError";
  }
}

// экспорт PIXI.Container в ВЕКТОРНЫЙ PDF: тот же рендерер, что и на экран, но
// рисует на канвасе страницы PDF -> в файл идёт вектор (drawPath/drawRect), не растр
export function exportContainerToPdf(
  ck: CanvasKit,
  container: PIXI.Container,
  width: number,
  height: number,
): Blob {
  if (!hasPdfBackend(ck)) throw new PdfBackendUnavailableError();

  const doc = ck.MakePDFDocument();
  const renderer = new PixiSkiaRenderer(ck);
  try {
    const pageCanvas = doc.beginPage(width, height);
    // фон под цвет сцены (#1f2430)
    pageCanvas.clear(ck.Color(31, 36, 48, 1));
    renderer.render(pageCanvas, container);
    doc.endPage();

    // close() — view на память WASM
    const bytes = new Uint8Array(doc.close());
    return new Blob([bytes], { type: "application/pdf" });
  } finally {
    renderer.dispose();
    doc.delete();
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
