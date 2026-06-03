import type { CanvasKit, Canvas } from "canvaskit-wasm";

// PDF-документ из кастомного биндинга (pdf_bindings.cpp); в стоковом canvaskit-wasm его нет
export interface SkPDFDocument {
  beginPage(width: number, height: number): Canvas; // размеры в поинтах (1pt = 1/72")
  endPage(): void;
  close(): Uint8Array; // байты PDF; скопировать до delete()
  delete(): void;
}

export type CanvasKitWithPDF = CanvasKit & {
  MakePDFDocument(): SkPDFDocument;
};

export function hasPdfBackend(ck: CanvasKit): ck is CanvasKitWithPDF {
  return typeof (ck as Partial<CanvasKitWithPDF>).MakePDFDocument === "function";
}
