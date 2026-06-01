import type * as PIXI from "pixi.js-legacy";
import type { CanvasKit, Canvas } from "canvaskit-wasm";
import { PixiSkiaRenderer } from "./renderer";

export { PixiSkiaRenderer } from "./renderer";

/**
 * Обёртка из ТЗ: отрисовывает `PIXI.Container` на канвасе Skia.
 *
 * Создаёт временный рендерер на один вызов (без кеша изображений между
 * кадрами). Для покадрового рендера со спрайтами выгоднее держать постоянный
 * экземпляр {@link PixiSkiaRenderer} и звать `render()` — так декодированные
 * текстуры кешируются.
 */
export const convertPixiContainerToSkia = (
  container: PIXI.Container,
  skCanvas: Canvas,
  CanvasKit: CanvasKit,
): void => {
  const renderer = new PixiSkiaRenderer(CanvasKit);
  renderer.render(skCanvas, container);
  renderer.dispose();
};
