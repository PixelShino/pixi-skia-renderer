import * as PIXI from "pixi.js-legacy";
import type { CanvasKit, Canvas, Paint, Image as SkImage } from "canvaskit-wasm";

// PIXI.Sprite → Skia. SkImage кешируется по baseTexture.uid (декодировать каждый кадр дорого)
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

  // текстура ещё грузится (async); тикер перерисует позже
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

  paint.setStyle(ck.PaintStyle.Fill);
  paint.setAlphaf(Math.max(0, Math.min(1, worldAlpha)));
  canvas.drawImageRect(image, srcRect, dstRect, paint);
  paint.setAlphaf(1);
}
