import * as PIXI from "pixi.js-legacy";

/** Колбэк для вывода событий в UI-лог. */
export type LogFn = (message: string) => void;

export interface Scene {
  readonly name: string;
  /** Строит свежий контейнер сцены (со своими обработчиками событий). */
  build: (onLog: LogFn) => PIXI.Container;
}

/** Делает объект интерактивным и логирует pointer-события (работает на обоих канвасах). */
function makeInteractive(obj: PIXI.DisplayObject, label: string, onLog: LogFn): void {
  obj.eventMode = "static";
  obj.cursor = "pointer";
  obj.on("pointerdown", () => onLog(`${label} pointerdown!`));
  obj.on("pointerup", () => onLog(`${label} pointerup!`));
}

/** Точки звезды (чередование внешнего/внутреннего радиуса) вокруг (0,0). */
function starPoints(spikes: number, outer: number, inner: number): number[] {
  const pts: number[] = [];
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = i * step - Math.PI / 2;
    pts.push(Math.cos(a) * r, Math.sin(a) * r);
  }
  return pts;
}

/** Спрайт из тестового PNG с заданной трансформацией. */
function makeSprite(
  x: number,
  y: number,
  scale: number,
  angle: number,
): PIXI.Sprite {
  const sprite = PIXI.Sprite.from("/sample.png");
  sprite.anchor.set(0.5);
  sprite.position.set(x, y);
  sprite.scale.set(scale);
  sprite.angle = angle;
  return sprite;
}

/**
 * Сцена 1 — пример из ТЗ: вложенный контейнер с линиями (g3, g4),
 * эллипс (g1), прямоугольник со скейлом (g2) + Sprite (PNG).
 */
const sceneFromSpec: Scene = {
  name: "Сцена из ТЗ",
  build(onLog) {
    const main = new PIXI.Container();
    const sub = new PIXI.Container();

    const g1 = new PIXI.Graphics();
    g1.beginFill("#ff0000").drawEllipse(0, 0, 200, 100).endFill();
    g1.position.set(200, 100);
    g1.angle = 30;
    makeInteractive(g1, "g1", onLog);

    const g2 = new PIXI.Graphics();
    g2.beginFill("#0000ff").drawRect(-50, -75, 100, 150).endFill();
    g2.position.set(120, 60);
    g2.angle = 15;
    g2.scale.set(1.5, 1.7);
    makeInteractive(g2, "g2", onLog);

    const g3 = new PIXI.Graphics();
    g3.lineStyle(10, "#ffffff", 1).moveTo(0, 0).lineTo(150, 100);
    g3.angle = -20;

    const g4 = new PIXI.Graphics();
    g4.lineStyle(10, "#ffff00", 1).moveTo(0, 70).lineTo(150, -30);
    g4.angle = 20;

    sub.position.set(75, 50);
    sub.addChild(g3, g4);

    const sprite = makeSprite(440, 360, 0.7, -12);
    makeInteractive(sprite, "sprite", onLog);

    main.addChild(sub, g1, g2, sprite);
    return main;
  },
};

/** Сцена 2 — набор фигур с разными трансформациями + спрайт. */
const sceneShapes: Scene = {
  name: "Фигуры и спрайт",
  build(onLog) {
    const main = new PIXI.Container();

    const star = new PIXI.Graphics();
    star.beginFill("#22c55e").drawPolygon(starPoints(5, 70, 30)).endFill();
    star.position.set(160, 150);
    star.angle = 10;
    makeInteractive(star, "star", onLog);

    const rrect = new PIXI.Graphics();
    rrect.beginFill("#f59e0b").drawRoundedRect(-60, -40, 120, 80, 18).endFill();
    rrect.lineStyle(6, "#7c2d12", 1).drawRoundedRect(-60, -40, 120, 80, 18);
    rrect.position.set(420, 130);
    rrect.angle = -8;
    rrect.scale.set(1.2, 1);
    makeInteractive(rrect, "rrect", onLog);

    const sprite = makeSprite(300, 360, 1, 18);
    makeInteractive(sprite, "sprite", onLog);

    main.addChild(star, rrect, sprite);
    return main;
  },
};

/** Сцена 3 — пучок линий (демонстрация stroke cap/join). */
const sceneLines: Scene = {
  name: "Линии",
  build(onLog) {
    const main = new PIXI.Container();
    const colors = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7"];
    const fan = new PIXI.Container();
    fan.position.set(300, 250);
    colors.forEach((c, i) => {
      const line = new PIXI.Graphics();
      line
        .lineStyle({ width: 12, color: c, cap: PIXI.LINE_CAP.ROUND })
        .moveTo(0, 0)
        .lineTo(180, 0);
      line.angle = -60 + i * 30;
      makeInteractive(line, `line${i + 1}`, onLog);
      fan.addChild(line);
    });
    main.addChild(fan);
    return main;
  },
};

export const SCENES: Scene[] = [sceneFromSpec, sceneShapes, sceneLines];

/** Генерирует случайную фигуру или линию для добавления в текущий контейнер. */
export function createRandomDisplayObject(onLog: LogFn): PIXI.Graphics {
  const g = new PIXI.Graphics();
  const color = Math.floor(Math.random() * 0xffffff);
  const kind = Math.floor(Math.random() * 3);

  if (kind === 0) {
    g.beginFill(color).drawCircle(0, 0, 20 + Math.random() * 40).endFill();
  } else if (kind === 1) {
    const w = 40 + Math.random() * 80;
    const h = 40 + Math.random() * 80;
    g.beginFill(color).drawRect(-w / 2, -h / 2, w, h).endFill();
  } else {
    g.lineStyle({
      width: 4 + Math.random() * 10,
      color,
      cap: PIXI.LINE_CAP.ROUND,
    })
      .moveTo(0, 0)
      .lineTo(-50 + Math.random() * 150, -50 + Math.random() * 150);
  }

  g.position.set(60 + Math.random() * 480, 60 + Math.random() * 380);
  g.angle = Math.random() * 360;
  makeInteractive(g, "random", onLog);
  return g;
}
