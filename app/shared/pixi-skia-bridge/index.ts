import type * as PIXI from "pixi.js-legacy";
import type { CanvasKit, Canvas } from "canvaskit-wasm";
import { PixiSkiaRenderer } from "./renderer";

export { PixiSkiaRenderer } from "./renderer";

// обёртка из ТЗ: разовый рендер контейнера в Skia. Для покадрового рендера
// лучше держать PixiSkiaRenderer — он кеширует текстуры между кадрами.
export const convertPixiContainerToSkia = (
  container: PIXI.Container,
  skCanvas: Canvas,
  CanvasKit: CanvasKit,
): void => {
  const renderer = new PixiSkiaRenderer(CanvasKit);
  renderer.render(skCanvas, container);
  renderer.dispose();
};
