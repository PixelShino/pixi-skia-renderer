import * as PIXI from "pixi.js-legacy";
import type { CanvasKit, Canvas, Paint, Image as SkImage } from "canvaskit-wasm";

/**
 * Отрисовывает `PIXI.Sprite` на канвасе Skia.
 *
 * Пиксели берутся из исходного DOM-источника текстуры
 * (`texture.baseTexture.resource.source` — HTMLImageElement / HTMLCanvasElement /
 * ImageBitmap) через `MakeImageFromCanvasImageSource`. Декодированный `SkImage`
 * кешируется по `baseTexture.uid`, т.к. декодирование на каждом кадре дорого.
 *
 * Геометрия как в Pixi: локальный прямоугольник спрайта —
 * `[-anchor.x*w, -anchor.y*h, w, h]`, где w/h = `texture.orig`. Матрица узла
 * уже наложена вызывающей стороной. `texture.frame` используется как src-регион
 * (поддержка атласов).
 */
export function drawSprite(
  ck: CanvasKit,
  canvas: Canvas,
  sprite: PIXI.Sprite,
  paint: Paint,
  worldAlpha: number,
  imageCache: Map<number, SkImage>,
): void {
  const texture = sprite.texture;
  const base = texture.baseTexture;

  // Ресурс может быть ещё не загружен (async) — пропускаем кадр,
  // тикер перерисует, когда base.valid станет true.
  if (!base.valid) return;

  const uid = base.uid;
  let image = imageCache.get(uid);
  if (!image) {
    const resource = base.resource as PIXI.BaseImageResource | undefined;
    const source = resource?.source as CanvasImageSource | undefined;
    if (!source) return;
    const created = ck.MakeImageFromCanvasImageSource(source);
    if (!created) return;
    image = created;
    imageCache.set(uid, image);
  }

  const w = texture.orig.width;
  const h = texture.orig.height;
  const ax = sprite.anchor.x;
  const ay = sprite.anchor.y;

  const frame = texture.frame;
  const srcRect = ck.XYWHRect(frame.x, frame.y, frame.width, frame.height);
  const dstRect = ck.XYWHRect(-ax * w, -ay * h, w, h);

  // Прозрачность спрайта через альфу краски.
  paint.setStyle(ck.PaintStyle.Fill);
  paint.setAlphaf(Math.max(0, Math.min(1, worldAlpha)));
  canvas.drawImageRect(image, srcRect, dstRect, paint);
  paint.setAlphaf(1);
}
