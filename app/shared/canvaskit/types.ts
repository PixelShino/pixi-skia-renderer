import type { CanvasKit, Canvas } from "canvaskit-wasm";

/**
 * PDF-документ Skia, экспонируемый кастомным биндингом (pdf_bindings.cpp).
 * Отсутствует в стоковом canvaskit-wasm.
 */
export interface SkPDFDocument {
  /** Начать страницу (размеры в поинтах, 1pt = 1/72"). Возвращает канвас для рисования. */
  beginPage(width: number, height: number): Canvas;
  endPage(): void;
  /** Финализировать PDF и вернуть байты (немедленно скопировать перед delete). */
  close(): Uint8Array;
  /** Освободить C++-объект. */
  delete(): void;
}

/** CanvasKit с PDF backend (наша сборка). */
export type CanvasKitWithPDF = CanvasKit & {
  MakePDFDocument(): SkPDFDocument;
};

/** Есть ли в данном CanvasKit рабочий PDF backend. */
export function hasPdfBackend(ck: CanvasKit): ck is CanvasKitWithPDF {
  return typeof (ck as Partial<CanvasKitWithPDF>).MakePDFDocument === "function";
}
