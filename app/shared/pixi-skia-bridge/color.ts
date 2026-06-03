import { Color } from "pixi.js-legacy";
import type { CanvasKit, InputColor } from "canvaskit-wasm";

// цвет Pixi (hex) → цвет CanvasKit; итоговая альфа = альфа стиля × worldAlpha
export function toSkColor(
  ck: CanvasKit,
  pixiColor: number | string,
  styleAlpha: number,
  worldAlpha: number,
): InputColor {
  const [r, g, b] = new Color(pixiColor).toUint8RgbArray();
  const alpha = Math.max(0, Math.min(1, styleAlpha * worldAlpha));
  return ck.Color(r, g, b, alpha);
}
