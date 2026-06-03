"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js-legacy";
import type { CanvasKit, Surface } from "canvaskit-wasm";
import { PixiSkiaRenderer } from "../shared/pixi-skia-bridge";
import { attachSkiaPointerEvents } from "../shared/pixi-skia-bridge/events";
import { loadCanvasKit } from "../shared/canvaskit/load";
import {
  exportContainerToPdf,
  downloadBlob,
} from "../shared/canvaskit/exportPdf";

export interface SkiaApi {
  hasPdf: boolean;
  exportPdf: () => void;
}

interface SkiaCanvasProps {
  app: PIXI.Application | null; // источник сцены — рендерим его stage
  onReady: (api: SkiaApi) => void;
  onLog: (message: string) => void;
}

const WIDTH = 600;
const HEIGHT = 500;
const CANVAS_ID = "skia-canvas";

// та же сцена Pixi, отрисованная через Skia; синхрон по тикеру Pixi
export default function SkiaCanvas({ app, onReady, onLog }: SkiaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onLogRef = useRef(onLog);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onLogRef.current = onLog;
    onReadyRef.current = onReady;
  }, [onLog, onReady]);

  useEffect(() => {
    if (!app || !canvasRef.current) return;

    const canvasEl = canvasRef.current;
    let surface: Surface | null = null;
    let renderer: PixiSkiaRenderer | null = null;
    let ck: CanvasKit | null = null;
    let detachEvents: (() => void) | null = null;
    let disposed = false;

    const renderFrame = () => {
      if (!surface || !renderer || !ck) return;
      const canvas = surface.getCanvas();
      canvas.clear(ck.Color(31, 36, 48, 1)); // фон под 0x1f2430
      renderer.render(canvas, app.stage);
      surface.flush();
    };

    loadCanvasKit().then(({ ck: kit, hasPdf }) => {
      if (disposed) return;
      ck = kit;
      surface = kit.MakeSWCanvasSurface(CANVAS_ID) ?? kit.MakeCanvasSurface(CANVAS_ID);
      if (!surface) {
        onLogRef.current("Не удалось создать Skia-surface");
        return;
      }
      renderer = new PixiSkiaRenderer(kit);

      app.ticker.add(renderFrame);
      detachEvents = attachSkiaPointerEvents(canvasEl, app, () => app.stage);

      onLogRef.current(
        hasPdf
          ? "Skia готова (PDF backend доступен)"
          : "Skia готова (стоковая сборка, экспорт PDF недоступен)",
      );

      onReadyRef.current({
        hasPdf,
        exportPdf: () => {
          if (!ck) return;
          try {
            const blob = exportContainerToPdf(ck, app.stage, WIDTH, HEIGHT);
            downloadBlob(blob, "scene.pdf");
            onLogRef.current("PDF экспортирован (scene.pdf)");
          } catch (err) {
            onLogRef.current(
              `Ошибка экспорта PDF: ${(err as Error).message}`,
            );
          }
        },
      });
    });

    return () => {
      disposed = true;
      detachEvents?.();
      if (renderer) app.ticker.remove(renderFrame);
      renderer?.dispose();
      surface?.delete();
    };
  }, [app]);

  return (
    <canvas
      id={CANVAS_ID}
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      className="h-full w-full"
    />
  );
}
