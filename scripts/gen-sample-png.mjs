// Генерирует public/sample.png — тестовую RGBA-картинку для PIXI.Sprite.
// Без внешних зависимостей: ручной PNG-энкодер (IHDR + IDAT + IEND, zlib из Node).
// Запуск: node scripts/gen-sample-png.mjs
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

const W = 140;
const H = 140;

// CRC32 для чанков PNG.
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

// Рисуем узнаваемый паттерн: диагональный градиент + жёлтый круг + рамка.
const raw = Buffer.alloc((W * 4 + 1) * H);
const cx = W / 2;
const cy = H / 2;
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0; // фильтр строки = 0 (None)
  for (let x = 0; x < W; x++) {
    const o = y * (W * 4 + 1) + 1 + x * 4;
    const dist = Math.hypot(x - cx, y - cy);
    const border = x < 6 || y < 6 || x >= W - 6 || y >= H - 6;
    if (border) {
      raw[o] = 30; raw[o + 1] = 30; raw[o + 2] = 40; raw[o + 3] = 255;
    } else if (dist < 42) {
      raw[o] = 250; raw[o + 1] = 210; raw[o + 2] = 30; raw[o + 3] = 255; // жёлтый круг
    } else {
      raw[o] = Math.round((x / W) * 80 + 30);
      raw[o + 1] = Math.round((y / H) * 160 + 40);
      raw[o + 2] = 200;
      raw[o + 3] = 255;
    }
  }
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const idat = zlib.deflateSync(raw, { level: 9 });

const png = Buffer.concat([
  sig,
  chunk("IHDR", ihdr),
  chunk("IDAT", idat),
  chunk("IEND", Buffer.alloc(0)),
]);

const outDir = path.join(process.cwd(), "public");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "sample.png");
fs.writeFileSync(outPath, png);
console.log(`written ${outPath} (${png.length} bytes, ${W}x${H})`);
