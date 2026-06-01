"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PixiCanvas, { type PixiApi } from "./components/PixiCanvas";
import SkiaCanvas, { type SkiaApi } from "./components/SkiaCanvas";
import { SCENES } from "./shared/scenes";

export default function Home() {
  const [logs, setLogs] = useState<string[]>([]);
  const [pixiApi, setPixiApi] = useState<PixiApi | null>(null);
  const [skiaApi, setSkiaApi] = useState<SkiaApi | null>(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [autoCycle, setAutoCycle] = useState(false);

  const addLog = useCallback((message: string) => {
    setLogs((prev) =>
      [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev].slice(0, 8),
    );
  }, []);

  const handlePixiReady = useCallback((api: PixiApi) => setPixiApi(api), []);
  const handleSkiaReady = useCallback((api: SkiaApi) => setSkiaApi(api), []);

  const switchScene = useCallback(
    (index: number) => {
      setSceneIndex(index);
      pixiApi?.setSceneIndex(index);
      addLog(`Сцена: ${SCENES[index].name}`);
    },
    [pixiApi, addLog],
  );

  // Авто-прокрутка сцен по таймеру (вариант «прокрутка контейнеров» из ТЗ).
  const sceneIndexRef = useRef(sceneIndex);
  useEffect(() => {
    sceneIndexRef.current = sceneIndex;
  }, [sceneIndex]);
  useEffect(() => {
    if (!autoCycle || !pixiApi) return;
    const id = setInterval(() => {
      switchScene((sceneIndexRef.current + 1) % SCENES.length);
    }, 2500);
    return () => clearInterval(id);
  }, [autoCycle, pixiApi, switchScene]);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-5 p-5">
      <header className="flex flex-col gap-3 border-b border-neutral-700 pb-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Pixi.js → Skia Renderer</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => pixiApi?.addRandomObject()}
              disabled={!pixiApi}
              className="rounded bg-blue-600 px-4 py-2 transition-colors hover:bg-blue-700 disabled:opacity-40">
              + Случайная фигура/линия
            </button>
            <button
              onClick={() => skiaApi?.exportPdf()}
              disabled={!skiaApi?.hasPdf}
              title={
                skiaApi?.hasPdf
                  ? "Экспорт сцены в векторный PDF (Skia)"
                  : "Нужна сборка CanvasKit с PDF backend (scripts/canvaskit-pdf)"
              }
              className="rounded bg-emerald-600 px-4 py-2 transition-colors hover:bg-emerald-700 disabled:opacity-40">
              Экспорт в PDF
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-neutral-400">Сцена:</span>
          {SCENES.map((scene, i) => (
            <button
              key={scene.name}
              onClick={() => switchScene(i)}
              disabled={!pixiApi}
              className={`rounded px-3 py-1 transition-colors disabled:opacity-40 ${
                i === sceneIndex
                  ? "bg-neutral-200 text-neutral-900"
                  : "bg-neutral-700 hover:bg-neutral-600"
              }`}>
              {scene.name}
            </button>
          ))}
          <label className="ml-2 flex items-center gap-2 text-neutral-300">
            <input
              type="checkbox"
              checked={autoCycle}
              onChange={(e) => setAutoCycle(e.target.checked)}
            />
            Авто-прокрутка
          </label>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="text-lg">Канвас 1 — Pixi.js (forceCanvas)</h2>
          <div className="aspect-[6/5] overflow-hidden rounded border border-neutral-700 bg-[#1f2430]">
            <PixiCanvas onReady={handlePixiReady} onLog={addLog} />
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg">Канвас 2 — Skia (CanvasKit)</h2>
          <div className="aspect-[6/5] overflow-hidden rounded border border-neutral-700 bg-[#1f2430]">
            <SkiaCanvas app={pixiApi?.app ?? null} onReady={handleSkiaReady} onLog={addLog} />
          </div>
        </section>
      </div>

      <footer className="rounded border border-neutral-700 bg-neutral-800 p-4">
        <h3 className="mb-2 font-semibold">Лог событий</h3>
        <ul className="space-y-0.5 font-mono text-sm text-neutral-400">
          {logs.length === 0 ? (
            <li>Нет событий — кликайте по фигурам на любом канвасе</li>
          ) : (
            logs.map((log, i) => <li key={i}>{log}</li>)
          )}
        </ul>
      </footer>
    </main>
  );
}
