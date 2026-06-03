import * as PIXI from "pixi.js-legacy";

export type LogFn = (message: string, color?: string) => void;

export interface Scene {
  readonly name: string;
  build: (onLog: LogFn) => PIXI.Container;
}

function colorToCss(n: number): string {
  return `#${(n & 0xffffff).toString(16).padStart(6, "0")}`;
}

function graphicsColor(g: PIXI.Graphics): string | undefined {
  for (const d of g.geometry.graphicsData) {
    if (d.fillStyle?.visible) return colorToCss(d.fillStyle.color as number);
  }
  for (const d of g.geometry.graphicsData) {
    if (d.lineStyle?.visible && d.lineStyle.width > 0)
      return colorToCss(d.lineStyle.color as number);
  }
  return undefined;
}

function hasFill(g: PIXI.Graphics): boolean {
  return g.geometry.graphicsData.some((d) => d.fillStyle?.visible);
}

function makeInteractive(obj: PIXI.DisplayObject, label: string, onLog: LogFn): void {
  obj.eventMode = "static";
  obj.cursor = "pointer";

  let color: string | undefined;
  if (obj instanceof PIXI.Graphics) {
    color = graphicsColor(obj);
    // линия без заливки: hit-test Pixi её не видит → hitArea по bbox
    if (!hasFill(obj)) {
      const b = obj.getLocalBounds();
      const pad = 8;
      obj.hitArea = new PIXI.Rectangle(
        b.x - pad,
        b.y - pad,
        b.width + pad * 2,
        b.height + pad * 2,
      );
    }
  }

  obj.on("pointerdown", () => onLog(`${label} pointerdown!`, color));
  obj.on("pointerup", () => onLog(`${label} pointerup!`, color));
}

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

// эталонная сцена из ТЗ — не менять
const sceneFromSpec: Scene = {
  name: "Эталон ТЗ",
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

const sceneShapes: Scene = {
  name: "Фигуры",
  build(onLog) {
    const main = new PIXI.Container();

    const star = new PIXI.Graphics();
    star.beginFill("#22c55e").drawPolygon(starPoints(5, 64, 28)).endFill();
    star.position.set(140, 130);
    star.angle = 10;
    makeInteractive(star, "star", onLog);

    const rrect = new PIXI.Graphics();
    rrect.beginFill("#f59e0b").drawRoundedRect(-60, -40, 120, 80, 18).endFill();
    rrect.lineStyle(6, "#7c2d12", 1).drawRoundedRect(-60, -40, 120, 80, 18);
    rrect.position.set(450, 120);
    rrect.angle = -8;
    rrect.scale.set(1.2, 1);
    makeInteractive(rrect, "rrect", onLog);

    const circle = new PIXI.Graphics();
    circle.beginFill("#06b6d4").drawCircle(0, 0, 46).endFill();
    circle.lineStyle(5, "#ecfeff", 1).drawCircle(0, 0, 46);
    circle.position.set(480, 350);
    makeInteractive(circle, "circle", onLog);

    const triangle = new PIXI.Graphics();
    triangle.beginFill("#a855f7").drawPolygon([0, -44, 40, 32, -40, 32]).endFill();
    triangle.position.set(150, 370);
    triangle.angle = -12;
    makeInteractive(triangle, "triangle", onLog);

    const sprite = makeSprite(300, 250, 0.95, 16);
    makeInteractive(sprite, "sprite", onLog);

    main.addChild(star, rrect, circle, triangle, sprite);
    return main;
  },
};

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

// вложенные контейнеры (24 уровня) — проверка накопления трансформаций по дереву
const sceneNested: Scene = {
  name: "Спираль",
  build(onLog) {
    // спираль во вложенном контейнере, корень в (0,0): иначе случайные фигуры уедут за кадр
    const main = new PIXI.Container();
    const spiral = new PIXI.Container();
    spiral.position.set(300, 250);
    main.addChild(spiral);

    const palette = [
      "#ef4444",
      "#f59e0b",
      "#eab308",
      "#22c55e",
      "#06b6d4",
      "#a855f7",
    ];

    let parent: PIXI.Container = spiral;
    for (let i = 0; i < 24; i++) {
      const link = new PIXI.Container();
      link.position.set(28, 0);
      link.rotation = 0.46;
      link.scale.set(0.94);

      const square = new PIXI.Graphics();
      square.beginFill(palette[i % palette.length]).drawRect(-11, -11, 22, 22).endFill();
      square.angle = i * 16;
      makeInteractive(square, "звено", onLog);

      link.addChild(square);
      parent.addChild(link);
      parent = link;
    }
    return main;
  },
};

export const SCENES: Scene[] = [
  sceneFromSpec,
  sceneShapes,
  sceneLines,
  sceneNested,
];

let randomCounter = 0; // id для меток random #N

export function createRandomDisplayObject(onLog: LogFn): PIXI.Graphics {
  const g = new PIXI.Graphics();
  const color = Math.floor(Math.random() * 0xffffff);
  const kind = Math.floor(Math.random() * 6);

  if (kind === 0) {
    g.beginFill(color).drawCircle(0, 0, 20 + Math.random() * 40).endFill();
  } else if (kind === 1) {
    const w = 40 + Math.random() * 80;
    const h = 40 + Math.random() * 80;
    g.beginFill(color).drawRect(-w / 2, -h / 2, w, h).endFill();
  } else if (kind === 2) {
    const w = 50 + Math.random() * 80;
    const h = 40 + Math.random() * 70;
    g.beginFill(color).drawRoundedRect(-w / 2, -h / 2, w, h, 12).endFill();
  } else if (kind === 3) {
    g.beginFill(color)
      .drawEllipse(0, 0, 30 + Math.random() * 40, 18 + Math.random() * 30)
      .endFill();
  } else if (kind === 4) {
    const r = 28 + Math.random() * 32;
    g.beginFill(color).drawPolygon([0, -r, r * 0.9, r * 0.7, -r * 0.9, r * 0.7]).endFill();
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
  makeInteractive(g, `random #${++randomCounter}`, onLog);
  return g;
}
