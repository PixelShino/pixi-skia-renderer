"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js-legacy";
import {
  SCENES,
  createRandomDisplayObject,
  type LogFn,
} from "../shared/scenes";

export interface PixiApi {
  app: PIXI.Application;
  setSceneIndex: (index: number) => void;
  addRandomObject: () => void;
}

interface PixiCanvasProps {
  onReady: (api: PixiApi) => void;
  onLog: LogFn;
}

const WIDTH = 600;
const HEIGHT = 500;

export default function PixiCanvas({ onReady, onLog }: PixiCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const sceneRef = useRef<PIXI.Container | null>(null);
  // onLog в ref: пересоздание колбэка не должно перезапускать эффект
  const onLogRef = useRef(onLog);
  useEffect(() => {
    onLogRef.current = onLog;
  }, [onLog]);

  useEffect(() => {
    if (!hostRef.current || appRef.current) return;

    const app = new PIXI.Application({
      width: WIDTH,
      height: HEIGHT,
      backgroundColor: 0x1f2430,
      forceCanvas: true, // требование ТЗ — canvas-рендерер, не WebGL
      antialias: true,
    });
    appRef.current = app;
    hostRef.current.appendChild(app.view as HTMLCanvasElement);

    const mountScene = (index: number) => {
      const next = SCENES[index].build((m, color) => onLogRef.current(m, color));
      if (sceneRef.current) {
        app.stage.removeChild(sceneRef.current);
        sceneRef.current.destroy({ children: true });
      }
      app.stage.addChild(next);
      sceneRef.current = next;
    };

    mountScene(0);

    onReady({
      app,
      setSceneIndex: (index) => mountScene(index),
      addRandomObject: () => {
        if (!sceneRef.current) return;
        sceneRef.current.addChild(
          createRandomDisplayObject((m, color) => onLogRef.current(m, color)),
        );
      },
    });

    return () => {
      app.destroy(true, { children: true });
      appRef.current = null;
      sceneRef.current = null;
    };
  }, [onReady]);

  return <div ref={hostRef} className="h-full w-full" />;
}
