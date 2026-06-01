import * as PIXI from "pixi.js-legacy";
import type { CanvasKit, Canvas, Paint, Image as SkImage } from "canvaskit-wasm";
import { applyPixiTransform, updateWorldTransform } from "./transform";
import { drawGraphics } from "./graphics";
import { drawSprite } from "./sprite";

/**
 * Рендерер дерева `PIXI.Container` средствами Skia (CanvasKit).
 *
 * Один и тот же экземпляр используется и для отрисовки на экранный канвас,
 * и для экспорта в PDF (метод `render` принимает любой `Canvas` — экранный
 * или канвас страницы PDF-документа), что гарантирует идентичность сцены.
 *
 * Держит переиспользуемый `Paint` и кеш декодированных изображений спрайтов —
 * их нужно явно освобождать через `dispose()` (память в куче WASM).
 */
export class PixiSkiaRenderer {
  private readonly paint: Paint;
  private readonly imageCache = new Map<number, SkImage>();

  constructor(private readonly ck: CanvasKit) {
    this.paint = new ck.Paint();
    this.paint.setAntiAlias(true);
  }

  /** Рекурсивно отрисовывает контейнер и всех его потомков на канвас Skia. */
  render(canvas: Canvas, container: PIXI.Container): void {
    // Гарантируем свежие матрицы независимо от рендер-цикла Pixi.
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
      // Sprite — частный случай Container, проверяем его раньше Container.
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

  /** Освобождает ресурсы CanvasKit (Paint и кешированные изображения). */
  dispose(): void {
    this.paint.delete();
    for (const image of this.imageCache.values()) image.delete();
    this.imageCache.clear();
  }
}
