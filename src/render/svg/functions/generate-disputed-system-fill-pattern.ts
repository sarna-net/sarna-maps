import { Faction, logger } from '../../../common';
import { traceFaction } from '../../../common/utils/faction-traversal-logger';
import { FactionRenderStyle } from '../types/faction-render-style';
import { sanitizeFactionToken } from './sanitize-faction-token';

const FILE_NAME = 'generate-disputed-system-fill-pattern.ts';

/**
 * Format a number to plain decimal notation (no scientific/exponent).
 * SVG path parsers are not required to accept exponent notation.
 */
function fmt(n: number): string {
  return +n.toFixed(10).replace(/\.?0+$/, '') + '';
}

/**
 * Parse a disputed affiliation key into its member faction ids.
 * Accepts dash-joined (`D-LC-DC`), parenthesized (`D(LC|DC)`) and
 * slash-separated (`D-CC/FS`) forms; the leading `D` marker is always dropped.
 */
function parseFactionKeys(factionKey: string): string[] {
  return factionKey
    .replace(/^D[\s()|-]*/i, '')
    .replace(/[/()|]/g, '-')
    .split('-')
    .filter(Boolean);
}

/**
 * Build one radial pie-slice path for a faction wedge centered at (cx, cy).
 *
 * Angles start at 12 o'clock (-π/2 in SVG's y-down space) and INCREASE
 * clockwise, matching sweep-flag=1. Each wedge spans exactly 360°/N and is
 * explicitly closed back to the center, so adjacent wedges tile the disc
 * without gaps. `stroke="none"` keeps the shared `.system` default stroke
 * from drawing divider lines along the wedge edges.
 */
function generateWedgePath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  color: string,
): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);

  return (
    `<path fill="${color}" stroke="none" ` +
    `d="M${fmt(cx)},${fmt(cy)} ` +
    `L${fmt(x1)},${fmt(y1)} ` +
    `A${fmt(r)},${fmt(r)},0,0,1,${fmt(x2)},${fmt(y2)} ` +
    `L${fmt(cx)},${fmt(cy)}Z" />`
  );
}

/**
 * Generate the markup for a disputed system dot: one radial pie-slice wedge
 * per faction, drawn directly at the dot's (x, y) with its exact radius,
 * plus a border ring that is styled via the `.disputed-dot-border` CSS class.
 *
 * The wedges are emitted as plain path elements in user coordinates (NOT as a
 * shared objectBoundingBox <pattern>). Patterns tile their content and their
 * tile origin is unreliable across renderers, which previously produced
 * offset, repeated pie charts instead of a single pie filling the dot.
 *
 * The caller must place the returned markup in the systems layer. The CSS
 * template styles the ring via `url(#...)`-free selectors.
 */
export function generateDisputedSystemFillPattern(
  factionKey: string,
  factions: Record<string, Faction>,
  x = 0,
  y = 0,
  radius = 1,
  style?: FactionRenderStyle,
  name = '',
): string {
  traceFaction(FILE_NAME, 'INPUT factionKey', factionKey);

  const factionKeys = parseFactionKeys(factionKey);

  traceFaction(FILE_NAME, 'PARSED factionKeys', JSON.stringify(factionKeys));

  if (factionKeys.length < 2) {
    logger.warn(
      FILE_NAME,
      `Cannot create disputed system fill pattern: Need at least two factions in key "${factionKey}"`
    );
    traceFaction(FILE_NAME, 'INVALID factionKeys LENGTH', factionKey);
    return '';
  }

  const N = factionKeys.length;
  const angleStep = (2 * Math.PI) / N;

  let wedges = '';

  for (let i = 0; i < N; i++) {
    // Start from top (12 o'clock) and sweep clockwise, so angles increase in
    // the sweep direction. (Decreasing angles with sweep-flag=1 would render
    // every wedge as the long arc 2π - 360°/N instead of 360°/N.)
    const startAngle = -Math.PI / 2 + i * angleStep;
    const endAngle = startAngle + angleStep;

    const factionColor = factions[factionKeys[i]]?.color || '#999999';
    wedges += generateWedgePath(x, y, radius, startAngle, endAngle, factionColor);
  }

  const safeKey = sanitizeFactionToken(factionKey);
  const dataName = name ? ` data-name="${name}"` : '';
  const group =
    `<g class="system disputed ${safeKey}"${dataName}>` +
    wedges +
    `<circle class="disputed-dot-border" cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(radius)}" />` +
    `</g>`;

  traceFaction(FILE_NAME, 'DISPUTED DOT MARKUP', group);

  return group;
}
