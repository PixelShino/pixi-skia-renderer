# Pixi.js → Skia Renderer

Приложение на TypeScript, объединяющее **`pixi.js-legacy`** и **Skia (CanvasKit/WASM)**:
собственная обёртка отрисовывает дерево `PIXI.Container` средствами Skia на втором
канвасе и экспортирует сцену в **векторный PDF** через Skia PDF backend.

Слева сцена рендерится штатным canvas-рендерером Pixi (`forceCanvas`), справа — та же
сцена, отрисованная через Skia. Pointer-события работают на обоих канвасах.

## Стек

- Next.js 16 (App Router) + React 19, TypeScript (strict)
- `pixi.js-legacy@7.2.4` (`PIXI.Application` с `forceCanvas: true`)
- `canvaskit-wasm` (Skia) — стоковая сборка с CDN либо своя сборка с PDF backend
- Tailwind CSS 4

## Запуск

```bash
npm install
npm run dev       # http://localhost:3000
```

Прочие команды:

```bash
npm run build     # продакшен-сборка + проверка типов
npm start         # запуск собранного приложения
npm run lint      # ESLint
```

## Возможности

- **Обёртка `convertPixiContainerToSkia`** (`app/shared/pixi-skia-bridge/`): рекурсивный
  обход дерева с накоплением трансформаций (translate/rotate/scale), поддержка
  `PIXI.Graphics` (`drawRect`, `drawRoundedRect`, `drawCircle`, `drawEllipse`,
  `drawPolygon`, `moveTo`/`lineTo` с cap/join) и `PIXI.Sprite` (PNG).
- **События** `pointerdown` / `pointerup` на обоих канвасах. На Skia-канвасе —
  через штатный hit-test Pixi (`EventBoundary.hitTest`).
- **Интерактивность**: переключение сцен-пресетов (кнопки + авто-прокрутка по таймеру),
  кнопка «Сгенерировать случайную фигуру/линию».
- **Экспорт в векторный PDF** через Skia PDF backend (см. ниже).

## Экспорт в PDF (Skia PDF backend)

Результат — **векторный** PDF (та же обёртка рисует в канвас страницы PDF-документа,
графика транслируется в векторные команды Skia).

> ⚠️ Стоковый `canvaskit-wasm` собран без PDF backend. Для экспорта нужна **своя
> сборка CanvasKit** с `skia_enable_pdf=true` и биндингом `MakePDFDocument`.

### Сборка CanvasKit с PDF

Скрипты в `scripts/canvaskit-pdf/`:

- `pdf_bindings.cpp` — embind-обёртка над Skia PDF backend (`MakePDFDocument`,
  `beginPage`/`endPage`/`close`).
- `build-public.sh` — сборка в Docker на публичном образе `emscripten/emsdk`
  (клонирует Skia, включает PDF, добавляет биндинг, компилирует).
- `build.sh` — вариант на официальном образе `gcr.io/skia-public/canvaskit-emsdk`
  (требует Google-авторизации: `gcloud auth login && gcloud auth configure-docker`).

```bash
# нужен Docker; ~30–80 ГБ на диске, ~40–90 мин
WORK=/d/skiabuild bash scripts/canvaskit-pdf/build-public.sh
```

Готовые `canvaskit.js` + `canvaskit.wasm` положить в `public/canvaskit/` и включить
локальную сборку флагом окружения:

```bash
# .env.local
NEXT_PUBLIC_USE_LOCAL_CANVASKIT=1
```

После этого кнопка «Экспорт в PDF» становится активной и скачивает `scene.pdf`.
Без флага приложение работает на стоковом CanvasKit с CDN (сцена рисуется, экспорт
PDF недоступен).

## Архитектура

```
app/
  page.tsx                       UI: переключение сцен, генерация, экспорт, лог
  components/
    PixiCanvas.tsx               PIXI.Application (forceCanvas), управление сценами
    SkiaCanvas.tsx               загрузка CanvasKit, рендер по тикеру, события, экспорт
  shared/
    scenes.ts                    сцены-пресеты (вкл. пример из ТЗ) + генератор фигур
    pixi-skia-bridge/
      index.ts                   convertPixiContainerToSkia + PixiSkiaRenderer
      renderer.ts                рекурсивный рендер дерева (с кешем изображений)
      graphics.ts                Graphics → Skia (формы, заливка, обводка)
      sprite.ts                  Sprite → Skia (drawImageRect)
      transform.ts               матрица Pixi → Skia
      color.ts                   цвет Pixi → Skia
      events.ts                  pointer-события на Skia-канвасе (hit-test)
    canvaskit/
      load.ts                    загрузка CanvasKit (локальная сборка / CDN)
      exportPdf.ts               экспорт сцены в PDF
      types.ts                   типы PDF backend
scripts/
  canvaskit-pdf/                 сборка CanvasKit с PDF backend
  gen-sample-png.mjs             генерация public/sample.png для спрайта
```

## Деплой

Next.js — на любом бесплатном хостинге (например, **Vercel**). Для экспорта PDF в
проде положить `public/canvaskit/canvaskit.{js,wasm}` и задать
`NEXT_PUBLIC_USE_LOCAL_CANVASKIT=1` в переменных окружения.
