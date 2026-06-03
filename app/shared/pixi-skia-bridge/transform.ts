import type { Canvas } from "canvaskit-wasm";
import type { Container, Matrix } from "pixi.js-legacy";

// пересчёт матриц поддерева: Skia рисует вне рендер-цикла Pixi, они могут устареть.
// у корня нет parent → временный (как делает рендерер Pixi)
export function updateWorldTransform(container: Container): void {
  const tempParent = container.enableTempParent();
  container.updateTransform();
  container.disableTempParent(tempParent);
}

// Pixi-матрица (a,b,c,d,tx,ty) → CanvasKit 3×3 row-major [a,c,tx,b,d,ty,0,0,1].
// накопление по дереву — через save/concat/restore на каждом узле
export function applyPixiTransform(canvas: Canvas, m: Matrix): void {
  canvas.concat([m.a, m.c, m.tx, m.b, m.d, m.ty, 0, 0, 1]);
}
