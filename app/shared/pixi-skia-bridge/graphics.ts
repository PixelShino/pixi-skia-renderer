import * as PIXI from "pixi.js-legacy";
import type { CanvasKit, Canvas, Paint } from "canvaskit-wasm";
import { toSkColor } from "./color";

/**
 * Отрисовывает один `PIXI.Graphics` на канвасе Skia.
 *
 * Читает разобранную геометрию (`geometry.graphicsData`) — список примитивов,
 * накопленных вызовами `beginFill/drawRect/drawEllipse/moveTo/lineTo/lineStyle`.
 * Для каждого примитива отдельно применяются заливка (fillStyle) и обводка
 * (lineStyle). Матрица узла уже наложена на канвас вызывающей стороной.
 *
 * @param worldAlpha накопленная альфа дерева (умножается на альфу стиля).
 * @param paint      переиспользуемый Paint (чтобы не плодить объекты WASM).
 */
export function drawGraphics(
  ck: CanvasKit,
  canvas: Canvas,
  graphics: PIXI.Graphics,
  paint: Paint,
  worldAlpha: number,
): void {
  for (const data of graphics.geometry.graphicsData) {
    const { shape, fillStyle, lineStyle } = data;

    // 1. Заливка
    if (fillStyle.visible) {
      paint.setStyle(ck.PaintStyle.Fill);
      paint.setColor(
        toSkColor(ck, fillStyle.color as number, fillStyle.alpha, worldAlpha),
      );
      drawShape(ck, canvas, paint, shape, true);
    }

    // 2. Обводка (линии и контуры)
    if (lineStyle.visible && lineStyle.width > 0) {
      paint.setStyle(ck.PaintStyle.Stroke);
      paint.setStrokeWidth(lineStyle.width);
      paint.setStrokeCap(mapCap(ck, lineStyle.cap));
      paint.setStrokeJoin(mapJoin(ck, lineStyle.join));
      paint.setStrokeMiter(lineStyle.miterLimit);
      paint.setColor(
        toSkColor(ck, lineStyle.color as number, lineStyle.alpha, worldAlpha),
      );
      drawShape(ck, canvas, paint, shape, false);
    }
  }
}

/** Рисует конкретную форму Pixi соответствующим примитивом Skia. */
function drawShape(
  ck: CanvasKit,
  canvas: Canvas,
  paint: Paint,
  shape: PIXI.IShape,
  isFill: boolean,
): void {
  switch (shape.type) {
    case PIXI.SHAPES.RECT: {
      const r = shape as PIXI.Rectangle;
      canvas.drawRect(ck.LTRBRect(r.x, r.y, r.x + r.width, r.y + r.height), paint);
      break;
    }
    case PIXI.SHAPES.RREC: {
      const r = shape as PIXI.RoundedRectangle;
      const rrect = ck.RRectXY(
        ck.LTRBRect(r.x, r.y, r.x + r.width, r.y + r.height),
        r.radius,
        r.radius,
      );
      canvas.drawRRect(rrect, paint);
      break;
    }
    case PIXI.SHAPES.CIRC: {
      const c = shape as PIXI.Circle;
      canvas.drawCircle(c.x, c.y, c.radius, paint);
      break;
    }
    case PIXI.SHAPES.ELIP: {
      const e = shape as PIXI.Ellipse;
      canvas.drawOval(
        ck.LTRBRect(e.x - e.width, e.y - e.height, e.x + e.width, e.y + e.height),
        paint,
      );
      break;
    }
    case PIXI.SHAPES.POLY: {
      const poly = shape as PIXI.Polygon;
      const pts = poly.points;
      if (pts.length < 4) break; // меньше 2 точек — рисовать нечего
      // В canvaskit-wasm 0.41.1 у Path нет билдер-методов (moveTo/lineTo) —
      // путь собираем фабрикой MakeFromCmds из verb-команд.
      const cmds: number[] = [ck.MOVE_VERB, pts[0], pts[1]];
      for (let i = 2; i < pts.length; i += 2)
        cmds.push(ck.LINE_VERB, pts[i], pts[i + 1]);
      // Для заливки путь замыкаем всегда; для обводки — по флагу closeStroke.
      if (isFill || poly.closeStroke) cmds.push(ck.CLOSE_VERB);
      const path = ck.Path.MakeFromCmds(cmds);
      if (path) {
        canvas.drawPath(path, paint);
        path.delete();
      }
      break;
    }
  }
}

function mapCap(ck: CanvasKit, cap: PIXI.LINE_CAP) {
  if (cap === PIXI.LINE_CAP.ROUND) return ck.StrokeCap.Round;
  if (cap === PIXI.LINE_CAP.SQUARE) return ck.StrokeCap.Square;
  return ck.StrokeCap.Butt;
}

function mapJoin(ck: CanvasKit, join: PIXI.LINE_JOIN) {
  if (join === PIXI.LINE_JOIN.ROUND) return ck.StrokeJoin.Round;
  if (join === PIXI.LINE_JOIN.BEVEL) return ck.StrokeJoin.Bevel;
  return ck.StrokeJoin.Miter;
}
