// Generates the PWA icons (public/icon-192.png, icon-512.png) with no dependencies.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
};

function png(size) {
  const bg = [37, 99, 235]; // #2563eb
  const fg = [255, 255, 255];
  const rows = [];
  const c = size / 2;
  const outer = size * 0.34;
  const inner = size * 0.25;
  const bar = size * 0.045;
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      const ring = d <= outer && d >= inner;
      // two short horizontal bars across the left side, like a euro sign
      const barLeft = x + 0.5 > c - outer * 1.15 && x + 0.5 < c + inner * 0.2;
      const bars = barLeft && (Math.abs(y + 0.5 - (c - size * 0.06)) < bar || Math.abs(y + 0.5 - (c + size * 0.06)) < bar) && d < outer;
      const arc = ring && x + 0.5 > c - outer * 0.1 ? false : ring;
      const color = arc || bars ? fg : bg;
      const o = 1 + x * 4;
      row[o] = color[0];
      row[o + 1] = color[1];
      row[o + 2] = color[2];
      row[o + 3] = 255;
    }
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync('public/icon-192.png', png(192));
writeFileSync('public/icon-512.png', png(512));
console.log('icons written');
