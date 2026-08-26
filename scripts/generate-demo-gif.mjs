// Generates assets/demo.gif: a simulated terminal session showing the
// claude-quest loop (invoke claude, play, check, rank up). Hand-rolled --
// no image/canvas/gif dependencies, since none are installable here without
// a native build toolchain. Pure pixel-buffer rendering + a from-scratch
// GIF89a/LZW encoder.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- 5x7 pixel font (only the glyphs this demo's text needs) ----------

const GLYPHS = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  " ": ["     ", "     ", "     ", "     ", "     ", "     ", "     "],
  $: ["..#..", ".####", "#.#..", ".###.", "..#.#", "####.", "..#.."],
  ">": ["#....", ".#...", "..#..", "...#.", "..#..", ".#...", "#...."],
  ":": [".....", "..#..", "..#..", ".....", "..#..", "..#..", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", "..#..", "....."],
};
const GLYPH_W = 5;
const GLYPH_H = 7;

// ---------- palette ----------

const BG = 0, FG = 1, ACCENT = 2, BORDER = 3;
const PALETTE = [
  [0x1f, 0x1b, 0x16], // BG: dark ink
  [0xf5, 0xf1, 0xe8], // FG: cream
  [0xd9, 0x77, 0x57], // ACCENT: warm orange
  [0x8a, 0x84, 0x78], // BORDER: stone
];

// ---------- canvas / text layout ----------

const CELL = 3; // px per font-pixel
const COLS = 32; // text columns
const ROWS = 8; // text rows (title + 6 body lines + spare)
const CHAR_W = (GLYPH_W + 1) * CELL;
const CHAR_H = (GLYPH_H + 2) * CELL;
const MARGIN = CELL * 4;
const W = COLS * CHAR_W + MARGIN * 2;
const H = ROWS * CHAR_H + MARGIN * 2;

function newBuffer(fill = BG) {
  return new Uint8Array(W * H).fill(fill);
}

function setPx(buf, x, y, color) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  buf[y * W + x] = color;
}

function fillRect(buf, x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) setPx(buf, x, y, color);
}

function drawChar(buf, ch, col, row, color) {
  const glyph = GLYPHS[ch.toUpperCase()] || GLYPHS[" "];
  const ox = MARGIN + col * CHAR_W;
  const oy = MARGIN + row * CHAR_H;
  for (let gy = 0; gy < GLYPH_H; gy++) {
    for (let gx = 0; gx < GLYPH_W; gx++) {
      if (glyph[gy][gx] !== "#") continue;
      fillRect(buf, ox + gx * CELL, oy + gy * CELL, CELL, CELL, color);
    }
  }
}

function drawText(buf, text, col, row, color) {
  for (let i = 0; i < text.length; i++) drawChar(buf, text[i], col + i, row, color);
}

function baseChrome() {
  const buf = newBuffer(BG);
  // window border
  fillRect(buf, 0, 0, W, CELL, BORDER);
  fillRect(buf, 0, H - CELL, W, CELL, BORDER);
  fillRect(buf, 0, 0, CELL, H, BORDER);
  fillRect(buf, W - CELL, 0, CELL, H, BORDER);
  // title
  drawText(buf, "claude quest", 9, 0, ACCENT);
  // divider under title
  fillRect(buf, MARGIN, MARGIN + CHAR_H - CELL, W - MARGIN * 2, CELL, BORDER);
  return buf;
}

// ---------- frame script ----------

const lines = Array.from({ length: 6 }, () => ({ text: "", color: FG }));
const frames = [];

function snapshot(delay = 8) {
  frames.push({ lines: lines.map((l) => ({ ...l })), delay });
}
function typeLine(idx, full, color, perFrame, delay = 8) {
  lines[idx].color = color;
  let shown = lines[idx].text.length;
  while (shown < full.length) {
    shown = Math.min(full.length, shown + perFrame);
    lines[idx].text = full.slice(0, shown);
    snapshot(delay);
  }
}
function hold(n, delay = 8) {
  for (let i = 0; i < n; i++) snapshot(delay);
}
function setLine(idx, text, color, delay = 8) {
  lines[idx].text = text;
  lines[idx].color = color;
  snapshot(delay);
}

snapshot(10); // empty terminal, brief beat before typing starts
typeLine(0, "$ claude", FG, 2);
hold(3);
typeLine(1, "> lets play claude quest", FG, 3);
hold(4);
setLine(2, "mission: first contact", ACCENT, 8);
hold(3, 8);
setLine(3, "checking", FG, 6);
hold(1, 6);
setLine(3, "checking.", FG, 6);
hold(1, 6);
setLine(3, "checking..", FG, 6);
hold(1, 6);
setLine(3, "checking...", FG, 6);
hold(2, 6);
setLine(4, "status: complete", ACCENT, 7);
setLine(4, "status: complete", FG, 7);
setLine(4, "status: complete", ACCENT, 7);
setLine(4, "status: complete", FG, 7);
setLine(4, "status: complete", ACCENT, 8);
setLine(5, "rank achieved: wayfarer", ACCENT, 8);
hold(14, 8);

const chrome = baseChrome();
const rasterFrames = frames.map(({ lines: ls, delay }) => {
  const buf = chrome.slice();
  ls.forEach((l, i) => drawText(buf, l.text, 2, i + 2, l.color));
  return { indices: buf, delay };
});

// ---------- GIF89a encoder ----------

class BitWriter {
  constructor() {
    this.bytes = [];
    this.buffer = 0;
    this.count = 0;
  }
  write(code, size) {
    this.buffer |= code << this.count;
    this.count += size;
    while (this.count >= 8) {
      this.bytes.push(this.buffer & 0xff);
      this.buffer >>= 8;
      this.count -= 8;
    }
  }
  finish() {
    if (this.count > 0) {
      this.bytes.push(this.buffer & 0xff);
      this.buffer = 0;
      this.count = 0;
    }
    return this.bytes;
  }
}

function lzwEncode(minCodeSize, data) {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize, nextCode, dict;
  const resetDict = () => {
    dict = new Map();
    for (let i = 0; i < clearCode; i++) dict.set(String(i), i);
    nextCode = eoiCode + 1;
    codeSize = minCodeSize + 1;
  };
  resetDict();
  const bw = new BitWriter();
  bw.write(clearCode, codeSize);
  let w = String(data[0]);
  for (let i = 1; i < data.length; i++) {
    const k = data[i];
    const wk = w + "," + k;
    if (dict.has(wk)) {
      w = wk;
      continue;
    }
    bw.write(dict.get(w), codeSize);
    dict.set(wk, nextCode);
    nextCode++;
    if (nextCode > 1 << codeSize && codeSize < 12) codeSize++;
    if (nextCode >= 4096) resetDict(), bw.write(clearCode, minCodeSize + 1);
    w = String(k);
  }
  bw.write(dict.get(w), codeSize);
  bw.write(eoiCode, codeSize);
  return bw.finish();
}

function buildGif(width, height, palette, gifFrames) {
  const out = [];
  const pushStr = (s) => { for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i)); };
  const push16 = (n) => out.push(n & 0xff, (n >> 8) & 0xff);

  pushStr("GIF89a");
  push16(width);
  push16(height);
  const colorBits = Math.max(2, Math.ceil(Math.log2(palette.length)));
  const numColors = 1 << colorBits;
  out.push(0x80 | ((colorBits - 1) << 4) | (colorBits - 1));
  out.push(0); // bg color index
  out.push(0); // pixel aspect ratio
  for (let i = 0; i < numColors; i++) {
    const c = palette[i] || [0, 0, 0];
    out.push(c[0], c[1], c[2]);
  }
  // NETSCAPE2.0 looping extension (loop forever)
  out.push(0x21, 0xff, 11);
  pushStr("NETSCAPE2.0");
  out.push(3, 1, 0, 0);
  out.push(0);

  const minCodeSize = colorBits;
  for (const frame of gifFrames) {
    out.push(0x21, 0xf9, 4, 0x04, frame.delay & 0xff, (frame.delay >> 8) & 0xff, 0, 0);
    out.push(0x2c);
    push16(0);
    push16(0);
    push16(width);
    push16(height);
    out.push(0x00);
    out.push(minCodeSize);
    const lzwBytes = lzwEncode(minCodeSize, frame.indices);
    let i = 0;
    while (i < lzwBytes.length) {
      const chunk = lzwBytes.slice(i, i + 255);
      out.push(chunk.length, ...chunk);
      i += chunk.length;
    }
    out.push(0x00);
  }
  out.push(0x3b);
  return Buffer.from(out);
}

const gif = buildGif(W, H, PALETTE, rasterFrames);
const outPath = join(__dirname, "..", "assets", "demo.gif");
writeFileSync(outPath, gif);
console.log(`wrote ${outPath}: ${W}x${H}, ${rasterFrames.length} frames, ${gif.length} bytes`);
