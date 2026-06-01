import type { Canvas } from "canvaskit-wasm";
import type { Container, Matrix } from "pixi.js-legacy";

/**
 * Принудительно пересчитывает worldTransform/localTransform всего поддерева.
 *
 * Нужно перед рендером в Skia и экспортом в PDF: Skia рисует, не полагаясь на
 * рендер-цикл Pixi, поэтому матрицы могли устареть (или быть не вычислены у
 * только что добавленных узлов). У корня нет parent — используем временный
 * родитель, как это делает рендерер Pixi.
 */
export function updateWorldTransform(container: Container): void {
  const tempParent = container.enableTempParent();
  container.updateTransform();
  container.disableTempParent(tempParent);
}

/**
 * Применяет локальную матрицу трансформации Pixi к канвасу Skia.
 *
 * Pixi-матрица 2D хранится как (a, b, c, d, tx, ty):
 *   | a  c  tx |
 *   | b  d  ty |
 *   | 0  0  1  |
 * CanvasKit.concat ожидает матрицу 3×3 в row-major порядке
 * [a, c, tx, b, d, ty, 0, 0, 1].
 *
 * Трансформации накапливаются по дереву за счёт save()/concat()/restore()
 * на каждом узле — это эквивалент worldTransform без его явного пересчёта.
 */
export function applyPixiTransform(canvas: Canvas, m: Matrix): void {
  canvas.concat([m.a, m.c, m.tx, m.b, m.d, m.ty, 0, 0, 1]);
}
