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

/** API канваса Skia, отдаётся наверх через onReady. */
export interface SkiaApi {
  /** Доступен ли экспорт PDF (зависит от наличия PDF backend в сборке CanvasKit). */
  hasPdf: boolean;
  /** Экспортировать текущую сцену в PDF и скачать файл. */
  exportPdf: () => void;
}

interface SkiaCanvasProps {
  /** Приложение Pixi — источник сцены (рендерим его stage). */
  app: PIXI.Application | null;
  onReady: (api: SkiaApi) => void;
  onLog: (message: string) => void;
}

const WIDTH = 600;
const HEIGHT = 500;
const CANVAS_ID = "skia-canvas";

/**
 * Правый канвас: та же сцена Pixi, отрисованная через Skia (CanvasKit).
 * Синхронизируется с Pixi по тикеру, поддерживает pointer-события и экспорт
 * сцены в векторный PDF.
 */
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
