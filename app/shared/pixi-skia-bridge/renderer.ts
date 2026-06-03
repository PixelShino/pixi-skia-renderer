import * as PIXI from "pixi.js-legacy";
import type { CanvasKit, Canvas, Paint, Image as SkImage } from "canvaskit-wasm";
import { applyPixiTransform, updateWorldTransform } from "./transform";
import { drawGraphics } from "./graphics";
import { drawSprite } from "./sprite";

// рендер дерева PIXI.Container в Skia; один экземпляр и на экран, и в PDF.
// Paint и кеш SkImage живут в WASM-куче — освобождать через dispose().
export class PixiSkiaRenderer {
  private readonly paint: Paint;
  private readonly imageCache = new Map<number, SkImage>();

  constructor(private readonly ck: CanvasKit) {
    this.paint = new ck.Paint();
    this.paint.setAntiAlias(true);
  }

  render(canvas: Canvas, container: PIXI.Container): void {
    // матрицы могут устареть вне рендер-цикла Pixi
    updateWorldTransform(container);
    this.renderNode(canvas, container, 1);
  }

  private renderNode(
    canvas: Canvas,
    node: PIXI.DisplayObject,
    parentAlpha: number,
  ): void {
    if (!node.visible || node.alpha <= 0) return;

    const worldAlpha = parentAlpha * node.alpha;

    canvas.save();
    applyPixiTransform(canvas, node.localTransform);

    if (node instanceof PIXI.Sprite) {
      // Sprite — подкласс Container, проверять до Container
      drawSprite(this.ck, canvas, node, this.paint, worldAlpha, this.imageCache);
    } else if (node instanceof PIXI.Graphics) {
      drawGraphics(this.ck, canvas, node, this.paint, worldAlpha);
    }

    if (node instanceof PIXI.Container) {
      for (const child of node.children) {
        this.renderNode(canvas, child, worldAlpha);
      }
    }

    canvas.restore();
  }

  dispose(): void {
    this.paint.delete();
    for (const image of this.imageCache.values()) image.delete();
    this.imageCache.clear();
  }
}
