"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PixiCanvas, { type PixiApi } from "./components/PixiCanvas";
import SkiaCanvas, { type SkiaApi } from "./components/SkiaCanvas";
import { SCENES } from "./shared/scenes";

interface LogEntry {
  time: string;
  message: string;
  color?: string;
}

export default function Home() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pixiApi, setPixiApi] = useState<PixiApi | null>(null);
  const [skiaApi, setSkiaApi] = useState<SkiaApi | null>(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [autoCycle, setAutoCycle] = useState(false);

  const addLog = useCallback((message: string, color?: string) => {
    setLogs((prev) =>
      [
        { time: new Date().toLocaleTimeString(), message, color },
        ...prev,
      ].slice(0, 50),
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

  // авто-прокрутка сцен — вариант «прокрутка контейнеров» из ТЗ
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

  const ready = !!pixiApi;

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-6">
      <Header hasPdf={skiaApi?.hasPdf} skiaReady={!!skiaApi} />

      <Toolbar
        sceneIndex={sceneIndex}
        onSwitch={switchScene}
        autoCycle={autoCycle}
        onAutoCycle={setAutoCycle}
        ready={ready}
        canExport={!!skiaApi?.hasPdf}
        onRandom={() => pixiApi?.addRandomObject()}
        onExport={() => skiaApi?.exportPdf()}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Viewport engine="PIXI.JS" sub="forceCanvas" role="источник">
          <PixiCanvas onReady={handlePixiReady} onLog={addLog} />
        </Viewport>
        <Viewport engine="SKIA" sub="CanvasKit / WASM" role="зеркало" live={!!skiaApi}>
          <SkiaCanvas app={pixiApi?.app ?? null} onReady={handleSkiaReady} onLog={addLog} />
        </Viewport>
      </div>

      <Console logs={logs} onClear={() => setLogs([])} />
    </main>
  );
}

function Header({ hasPdf, skiaReady }: { hasPdf?: boolean; skiaReady: boolean }) {
  const label = !skiaReady
    ? "инициализация Skia…"
    : hasPdf
      ? "PDF backend готов"
      : "PDF backend недоступен";

  return (
    <header className="flex items-center justify-between gap-4 border-b border-ink-800 pb-5">
      <div className="flex items-center gap-3">
        <Mark />
        <div className="leading-tight">
          <h1 className="font-mono text-sm font-semibold tracking-tight text-ink-100">
            pixi → skia
          </h1>
          <p className="text-xs text-ink-500">
            рендер PIXI.Container средствами Skia · векторный PDF
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-ink-800 bg-ink-900 px-3 py-1.5">
        <Dot on={!!hasPdf} />
        <span className="font-mono text-xs text-ink-400">{label}</span>
      </div>
    </header>
  );
}

function Mark() {
  return (
    <span className="relative block size-7" aria-hidden>
      <span className="absolute inset-0 rounded-md border border-ink-600" />
      <span className="absolute bottom-0 right-0 size-4 rounded-[5px] bg-accent" />
    </span>
  );
}

function Toolbar({
  sceneIndex,
  onSwitch,
  autoCycle,
  onAutoCycle,
  ready,
  canExport,
  onRandom,
  onExport,
}: {
  sceneIndex: number;
  onSwitch: (i: number) => void;
  autoCycle: boolean;
  onAutoCycle: (v: boolean) => void;
  ready: boolean;
  canExport: boolean;
  onRandom: () => void;
  onExport: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Сцена"
          className="flex items-center gap-0.5 rounded-lg border border-ink-800 bg-ink-900 p-0.5">
          {SCENES.map((scene, i) => {
            const active = i === sceneIndex;
            return (
              <button
                key={scene.name}
                role="tab"
                aria-selected={active}
                onClick={() => onSwitch(i)}
                disabled={!ready}
                className={`rounded-[6px] px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  active
                    ? "bg-ink-700 text-ink-100"
                    : "text-ink-400 hover:text-ink-200"
                }`}>
                {scene.name}
              </button>
            );
          })}
        </div>

        <Toggle
          checked={autoCycle}
          onChange={onAutoCycle}
          disabled={!ready}
          label="авто-прокрутка"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRandom}
          disabled={!ready}
          className="rounded-md border border-ink-700 px-3.5 py-2 text-xs font-medium text-ink-200 transition hover:border-ink-600 hover:bg-ink-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40">
          + случайная фигура
        </button>
        <button
          onClick={onExport}
          disabled={!canExport}
          title={
            canExport
              ? "Экспорт сцены в векторный PDF (Skia)"
              : "Нужна сборка CanvasKit с PDF backend (scripts/canvaskit-pdf)"
          }
          className="rounded-md bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink transition hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink-800 disabled:text-ink-600">
          экспорт PDF
        </button>
      </div>
    </div>
  );
}

function Viewport({
  engine,
  sub,
  role,
  live = false,
  children,
}: {
  engine: string;
  sub: string;
  role: string;
  live?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-ink-800">
      <div className="flex items-center justify-between border-b border-ink-800 bg-ink-900 px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xs font-medium uppercase tracking-widest text-ink-200">
            {engine}
          </span>
          <span className="font-mono text-[10px] text-ink-500">{sub}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-ink-500">
            {role}
          </span>
          {live && (
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-ink-400">
              <Dot on />
              live sync
            </span>
          )}
        </div>
      </div>
      <div className="relative aspect-[6/5] bg-scene">
        {children}
        <Ticks />
      </div>
    </section>
  );
}

function Ticks() {
  const base = "pointer-events-none absolute size-3 border-ink-600/40";
  return (
    <>
      <span className={`${base} left-2 top-2 border-l border-t`} />
      <span className={`${base} right-2 top-2 border-r border-t`} />
      <span className={`${base} bottom-2 left-2 border-b border-l`} />
      <span className={`${base} bottom-2 right-2 border-b border-r`} />
    </>
  );
}

function Console({ logs, onClear }: { logs: LogEntry[]; onClear: () => void }) {
  return (
    <section className="overflow-hidden rounded-lg border border-ink-800 bg-ink-900">
      <div className="flex items-center justify-between border-b border-ink-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-300">
            консоль событий
          </span>
          <span className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-ink-400">
            {logs.length}
          </span>
        </div>
        <button
          onClick={onClear}
          disabled={logs.length === 0}
          className="font-mono text-[11px] text-ink-500 transition hover:text-ink-300 disabled:opacity-40">
          очистить
        </button>
      </div>
      <ul className="max-h-44 space-y-px overflow-y-auto p-3 font-mono text-xs">
        {logs.length === 0 ? (
          <li className="text-ink-600">
            кликайте по фигурам на любом канвасе — события приходят с обоих
          </li>
        ) : (
          logs.map((log, i) => (
            <li key={i} className="text-ink-300">
              <span className="text-ink-600">[{log.time}]</span>{" "}
              <span style={{ color: legibleOnDark(log.color) }}>
                {log.message}
              </span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

// осветление тёмного цвета фигуры, чтобы строка лога читалась на тёмном фоне
function legibleOnDark(hex?: string): string | undefined {
  const m = hex && /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return undefined;
  let r = parseInt(m[1].slice(0, 2), 16);
  let g = parseInt(m[1].slice(2, 4), 16);
  let b = parseInt(m[1].slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum < 0.5) {
    const t = ((0.5 - lum) / 0.5) * 0.75;
    r = Math.round(r + (255 - r) * t);
    g = Math.round(g + (255 - g) * t);
    b = Math.round(b + (255 - b) * t);
  }
  return `rgb(${r}, ${g}, ${b})`;
}

function Dot({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-block size-1.5 rounded-full ${
        on ? "bg-accent animate-live" : "bg-ink-600"
      }`}
    />
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group flex items-center gap-2 text-xs text-ink-400 transition hover:text-ink-200 disabled:cursor-not-allowed disabled:opacity-40">
      <span
        className={`relative h-4 w-7 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-ink-700"
        }`}>
        <span
          className={`absolute left-0.5 top-0.5 size-3 rounded-full bg-ink-100 transition-transform duration-150 ease-out ${
            checked ? "translate-x-3" : ""
          }`}
        />
      </span>
      {label}
    </button>
  );
}
