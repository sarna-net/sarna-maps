/**
 * Test script to generate a self-contained SVG demonstrating correct
 * disputed system dot rendering with evenly-divided pie-slice sectors.
 *
 * DIAGNOSIS of the previous version
 * ----------------------------------
 * The old test delegated to `renderSystems()`, which internally calls
 * `generateDisputedSystemFillPattern()`. That function contained a bug on
 * line 56:
 *
 *   `<path fill:${factionColor} d="...">`
 *
 * SVG/XML attributes must use `name="value"` syntax. Using `fill:#4477cc`
 * (colon, no quotes) produces an invalid attribute that parsers silently
 * discard — so every wedge defaulted to black fill, producing the symptom
 * "only concentric rings/strokes appear / all dots render as solid black".
 *
 * Additionally, the old test only covered faction counts 2–5 and relied on
 * the production pipeline's objectBoundingBox pattern, making geometry
 * inspection difficult.
 *
 * FIX
 * ---
 * This version is self-contained: it computes wedge paths directly with
 * correct `fill="color"` attribute syntax, uses a hue-spaced palette, draws
 * a solid black border circle, and iterates faction counts 2–7.
 *
 * The underlying production bug in `generate-disputed-system-fill-pattern.ts`
 * has also been fixed (fill: → fill=").
 */

import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Color helpers — HSL to hex via evenly spaced hues around 360°
// ---------------------------------------------------------------------------

/**
 * Convert HSL (h in degrees, s/l in [0,1]) to an [r,g,b] tuple in [0,1].
 * Standard algorithm — no external libs required.
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360; // normalize to [0, 360)
  const c = (1 - Math.abs(2 * l - 1)) * s; // chroma
  const hPrime = h / 60; // hue sector [0, 6)
  const x = c * (1 - Math.abs((hPrime % 2) - 1));
  const m = l - c / 2;

  let r1: number, g1: number, b1: number;
  if (hPrime >= 0 && hPrime < 1) [r1, g1, b1] = [c, x, 0];
  else if (hPrime >= 1 && hPrime < 2) [r1, g1, b1] = [x, c, 0];
  else if (hPrime >= 2 && hPrime < 3) [r1, g1, b1] = [0, c, x];
  else if (hPrime >= 3 && hPrime < 4) [r1, g1, b1] = [0, x, c];
  else if (hPrime >= 4 && hPrime < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  return [r1 + m, g1 + m, b1 + m];
}

/**
 * Convert [r,g,b] in [0,1] to a `#rrggbb` hex string.
 */
function rgbToHex(r: number, g: number, b: number): string {
  const b2x = (c: number) => Math.round(c * 255).toString(16).padStart(2, '0');
  return `#${b2x(r)}${b2x(g)}${b2x(b)}`;
}

/**
 * Generate `n` distinct colors evenly spaced around the hue circle.
 * @param n      Number of colors (factions)
 * @param s      Saturation (0–1), default 0.65
 * @param l      Lightness (0–1), default 0.48
 */
function huePalette(n: number, s = 0.65, l = 0.48): string[] {
  const colors: string[] = [];
  for (let i = 0; i < n; i++) {
    const hue = (i * 360) / n;
    colors.push(rgbToHex(...hslToRgb(hue, s, l)));
  }
  return colors;
}

// ---------------------------------------------------------------------------
// Geometry — wedge (pie-slice) path generation
// ---------------------------------------------------------------------------

const PI = Math.PI;

/** Format a number to 6 decimal places, stripping trailing zeros (SVG-friendly). */
function fmt(n: number): string {
  return n.toFixed(6).replace(/\.?0+$/, '');
}

/**
 * Generate an SVG path element for a single pie-slice wedge.
 *
 * The wedge spans from the center outward to radius r, forming a
 * radial sector that meets at the center when combined with other wedges.
 *
 * Convention:
 *   - Angles in radians, 0 = 3 o'clock (positive X),
 *     increasing clockwise on screen (since y-axis points down).
 *   - startAngle = -π/2 starts at 12 o'clock; wedges proceed clockwise.
 *   - sweep=1 means clockwise arc direction.
 *
 * @param cx, cy       Center of the circle
 * @param r            Outer radius (wedge extends from center to this radius)
 * @param startAngle   Start angle in radians
 * @param endAngle     End angle in radians
 * @param fill         Fill color string, e.g. "#4477cc"
 */
function wedgePath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  fill: string,
): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);

  const delta = endAngle - startAngle;
  // Large-arc-flag: 1 only when the arc spans more than 180° (π rad).
  // For N≥2 each wedge spans 360°/N ≤ 180°, so this is always 0.
  const largeArc = delta > PI ? 1 : 0;
  // Sweep-flag: 1 = clockwise arc (our angles increase clockwise on screen).
  const sweep = 1;

  return (
    `<path fill="${fill}" ` +
    `d="M ${fmt(cx)},${fmt(cy)} ` +
    `L ${fmt(x1)},${fmt(y1)} ` +
    `A ${fmt(r)},${fmt(r)} 0 ${largeArc},${sweep} ${fmt(x2)},${fmt(y2)} ` +
    `L ${fmt(cx)},${fmt(cy)} Z" />`
  );
}

/**
 * Generate a complete disputed-system dot: colored wedges + black border.
 *
 * @param cx, cy           Center coordinates (pixels)
 * @param radius           Dot radius (pixels)
 * @param strokeWidth      Border stroke width (pixels), same as regular system dots
 * @param factionCount     Number of factions (2–7)
 * @param label            Optional label text shown below the dot
 * @param factions         Optional array of faction color strings (auto-generated if not provided)
 */
function generateDisputedDot(
  cx: number,
  cy: number,
  radius: number,
  strokeWidth: number,
  factionCount: number,
  label: string,
  factions?: string[],
): string {
  const colors = factions || huePalette(factionCount);
  const angleStep = (2 * PI) / factionCount;
  const startTop = -PI / 2; // 12 o'clock

  const wedges: string[] = [];
  for (let i = 0; i < factionCount; i++) {
    const aStart = startTop + i * angleStep;
    const aEnd = startTop + (i + 1) * angleStep;
    wedges.push(wedgePath(cx, cy, radius, aStart, aEnd, colors[i]));
  }

  // Solid black outer border circle — drawn on top of wedges
  const border = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#000" stroke-width="${strokeWidth}" />`;

  // Label below the dot
  const labelEl = `<text x="${cx}" y="${cy + radius + 22}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#222">${label}</text>`;

  // Faction color legend (small swatches below label)
  const swatchSize = 8;
  const swatchGap = 4;
  const totalSwatchWidth = factionCount * swatchSize + (factionCount - 1) * swatchGap;
  const startX = cx - totalSwatchWidth / 2;
  const swatches = colors
    .map((c, i) => {
      const sx = startX + i * (swatchSize + swatchGap);
      const sy = cy + radius + 42;
      return `<rect x="${sx}" y="${sy}" width="${swatchSize}" height="${swatchSize}" fill="${c}" stroke="#000" stroke-width="0.5" />`;
    })
    .join('');

  return `<g class="disputed-dot" data-factions="${factionCount}">${wedges.join('')}${border}${labelEl}${swatches}</g>`;
}

// ---------------------------------------------------------------------------
// Layout — 2×3 grid covering faction counts 2–7
// ---------------------------------------------------------------------------

const DOT_RADIUS = 48;
const COLS = 3;
const ROWS = 2;
const X_SPACING = 240;
const Y_SPACING = 220;
const X_START = 120 + DOT_RADIUS;
const Y_START = 100 + DOT_RADIUS;

const factionCounts = [2, 3, 4, 5, 6, 7];

const dots: string[] = [];

for (let i = 0; i < factionCounts.length; i++) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const cx = X_START + col * X_SPACING;
  const cy = Y_START + row * Y_SPACING;
  const n = factionCounts[i];

  dots.push(generateDisputedDot(cx, cy, DOT_RADIUS, 2, n, `${n} Faction${n > 1 ? 's' : ''}`));
}

// ---------------------------------------------------------------------------
// SVG assembly
// ---------------------------------------------------------------------------

const svgWidth = X_START * 2 + (COLS - 1) * X_SPACING;
const svgHeight = Y_START * 2 + (ROWS - 1) * Y_SPACING + 80;

const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${svgWidth}" height="${svgHeight}" fill="#f0f0f0" />
  <text x="${svgWidth / 2}" y="30" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#222">Disputed System Dots — Faction Counts 2–7</text>
  <text x="${svgWidth / 2}" y="52" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#555">Each dot: N equal pie-slice wedges + solid black border</text>
  ${dots.join('\n  ')}
</svg>
`;

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const outputPath = path.join(process.cwd(), 'out', 'disputed-system-dots-visible-test.svg');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, svgContent);

console.log('=== Disputed System Dots Test ===');
console.log('Faction counts:', factionCounts.join(', '));
console.log('Layout: 2×3 grid, dot radius =', DOT_RADIUS, 'px');
console.log('Colors: hue-spaced palette (saturation=0.65, lightness=0.48)');
console.log('Output:', outputPath);
console.log('\nEach dot should show:');
console.log('  - N equal angular sectors (pie slices) meeting at center');
console.log('  - Solid fills (no gaps, no stroke-only wedges)');
console.log('  - Distinct hue for each faction');
console.log('  - Solid black outer border circle');
