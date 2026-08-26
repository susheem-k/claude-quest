// Generates assets/logo.svg: a pixel-art crab mascot on a rounded badge.
// The crab is an original, unofficial mascot for this repo -- not Anthropic
// branding -- drawn in a warm palette that nods to Claude's colors.
//
// Design is authored as a 9-column left half (L0..L8) plus a 1-column
// center (C); each row is mirrored (L8..L0) to build the full 19-wide grid,
// so the crab is guaranteed left/right symmetric.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PALETTE = {
  ".": null,
  O: "#2B211A", // outline / pupils
  S: "#D97757", // shell
  H: "#F0A878", // shell highlight
  E: "#F5F1E8", // eye white
  C: "#F0EEE6", // cape
  A: "#B4402A", // scarf accent
};

// Each row: [left9, center1]. Left half reversed (excluding center) mirrors
// to the right half.
const ROWS = [
  ["........O", "."],
  ["........O", "."],
  [".......OO", "."],
  [".......OO", "."],
  ["....SSSSS", "S"],
  ["O..SSSSSS", "A"],
  ["SO.SSSSSS", "S"],
  ["SSSHHSSSS", "S"],
  ["SSSSHHSSS", "S"],
  [".OSSSSSSO", "S"],
  [".CC....CC", "."],
  ["..O....O.", "."],
  ["..OO..OO.", "."],
  [".OO....OO", "."],
  ["OO......O", "."],
];

const LEFT_W = 9;
const GRID_W = LEFT_W * 2 + 1;
const GRID_H = ROWS.length;

function buildGrid() {
  const grid = [];
  for (const [left, center] of ROWS) {
    if (left.length !== LEFT_W) throw new Error(`bad row width: "${left}"`);
    const rightReversed = left.split("").reverse().join("");
    grid.push(left + center + rightReversed);
  }
  return grid;
}

function svgFor(grid) {
  const PX = 20; // px per pixel-art cell
  const PAD = 2; // cells of padding inside the badge
  const badgeCells = GRID_W + PAD * 2;
  const size = badgeCells * PX;
  const offsetX = PAD * PX;
  const offsetY = ((GRID_H + PAD * 2) - GRID_H) / 2 * PX + PAD * PX / 2;

  const rects = [];
  for (let y = 0; y < GRID_H; y++) {
    let x = 0;
    while (x < GRID_W) {
      const ch = grid[y][x];
      if (ch === "." || !PALETTE[ch]) {
        x++;
        continue;
      }
      let runEnd = x + 1;
      while (runEnd < GRID_W && grid[y][runEnd] === ch) runEnd++;
      const w = runEnd - x;
      rects.push(
        `<rect x="${offsetX + x * PX}" y="${offsetY + y * PX}" width="${w * PX}" height="${PX}" fill="${PALETTE[ch]}"/>`
      );
      x = runEnd;
    }
  }

  const canvas = badgeCells * PX;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas} ${canvas}" width="${canvas}" height="${canvas}">
  <title>claude-quest mascot</title>
  <rect x="0" y="0" width="${canvas}" height="${canvas}" rx="${PX * 3}" fill="#F5F1E8"/>
  <rect x="${PX * 0.75}" y="${PX * 0.75}" width="${canvas - PX * 1.5}" height="${canvas - PX * 1.5}" rx="${PX * 2.5}" fill="none" stroke="#D97757" stroke-width="${PX * 0.35}"/>
  ${rects.join("\n  ")}
</svg>
`;
}

const grid = buildGrid();
const svg = svgFor(grid);
const outPath = join(__dirname, "..", "assets", "logo.svg");
writeFileSync(outPath, svg, "utf8");
console.log(`wrote ${outPath} (${GRID_W}x${GRID_H} grid)`);
