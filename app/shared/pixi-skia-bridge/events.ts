import * as PIXI from "pixi.js-legacy";
import { updateWorldTransform } from "./transform";

// pointer-события для Skia-канваса: он без Pixi-рендерера, поэтому DOM-события
// ловятся вручную и прогоняются через тот же hitTest/EventBoundary, что и Pixi.
// events.domElement рендерера НЕ трогать — его сеттер пересоздаёт листенеры Pixi-канваса.
export function attachSkiaPointerEvents(
  skiaCanvas: HTMLCanvasElement,
  app: PIXI.Application,
  getStage: () => PIXI.Container,
): () => void {
  const events = app.renderer.events;

  const dispatch = (type: "pointerdown" | "pointerup", e: PointerEvent) => {
    const stage = getStage();
    const rect = skiaCanvas.getBoundingClientRect();
    const resolution = app.renderer.resolution;

    // CSS-координаты → пиксели канваса → координаты сцены (÷ resolution)
    const point = new PIXI.Point(
      (((e.clientX - rect.left) / rect.width) * skiaCanvas.width) / resolution,
      (((e.clientY - rect.top) / rect.height) * skiaCanvas.height) / resolution,
    );

    // worldTransform перед hitTest — Pixi мог не прогнать сцену
    updateWorldTransform(stage);

    const boundary = events.rootBoundary;
    boundary.rootTarget = stage;

    const target = boundary.hitTest(point.x, point.y);
    if (!target) return;

    const ev = new PIXI.FederatedPointerEvent(boundary);
    ev.type = type;
    ev.pointerId = e.pointerId || 1;
    ev.pointerType = e.pointerType || "mouse";
    ev.button = e.button;
    ev.buttons = e.buttons;
    ev.global.copyFrom(point);
    ev.client.set(e.clientX, e.clientY);
    ev.screen.copyFrom(point);
    ev.target = target;
    ev.nativeEvent = e;
    boundary.dispatchEvent(ev, type);
  };

  const onDown = (e: PointerEvent) => dispatch("pointerdown", e);
  const onUp = (e: PointerEvent) => dispatch("pointerup", e);
  skiaCanvas.addEventListener("pointerdown", onDown);
  skiaCanvas.addEventListener("pointerup", onUp);

  return () => {
    skiaCanvas.removeEventListener("pointerdown", onDown);
    skiaCanvas.removeEventListener("pointerup", onUp);
  };
}
