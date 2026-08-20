import { Point2d } from '../../../../common';

/**
 * Number of decimal places used to key node coordinates throughout the border
 * pipeline. Every endpoint-matching pass (section assembly, merge, faction-loop
 * assembly, normalization) MUST key on this same rounding so that coordinates
 * which agree to this precision are treated as the same physical point even if
 * they diverge at finer precision (float mutations in simplify passes).
 */
export const COORD_KEY_DECIMALS = 6;

/**
 * Rounds a single coordinate to {@link COORD_KEY_DECIMALS} decimal places and
 * normalizes -0.000000 to 0.000000. Applied to mutated coordinates immediately
 * after assignment in simplify passes so duplicate copies of a node can never
 * drift apart across the 6-decimal rollover boundary.
 */
export function round6(x: number): number {
  const fixed = x.toFixed(COORD_KEY_DECIMALS);
  return fixed === '-0.000000' ? 0 : Number(fixed);
}

/**
 * The single, canonical coordinate key for a node, rounded to
 * {@link COORD_KEY_DECIMALS} decimal places. Backed by the same rounding as
 * `round6` so mutating coordinates with `round6` keeps them inside the bucket
 * this function computes.
 *
 * This is the ONE equality primitive for endpoint matching. The duplicated
 * `coordKey` in build-faction-loops.ts and `coordinateKey` in
 * normalize-border-node-ids.ts were consolidated here.
 */
export function coordKey(x: number, y: number): string {
  const fx = x.toFixed(COORD_KEY_DECIMALS);
  const fy = y.toFixed(COORD_KEY_DECIMALS);
  const nx = fx === '-0.000000' ? '0.000000' : fx;
  const ny = fy === '-0.000000' ? '0.000000' : fy;
  return `${nx},${ny}`;
}

/**
 * Convenience overload that derives the key from a point object.
 */
export function coordKeyOf(point: Point2d): string {
  return coordKey(point.x, point.y);
}
