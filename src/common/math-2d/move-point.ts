import { Point2d, Vector2d } from './types';

/**
 * Modifies the given point by translating it by the given vector.
 *
 * @param p The point
 * @param v The translation vector
 */
export function movePoint(p: Point2d, v: Vector2d) {
  // eslint-disable-next-line no-param-reassign
  p.x += v.a;
  // eslint-disable-next-line no-param-reassign
  p.y += v.b;
}
