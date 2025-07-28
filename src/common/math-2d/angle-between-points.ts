import { Point2d } from './types';

/**
 * Calculates the angle of a line drawn between two points and a horizontal line.
 *
 * @param p1 The first point
 * @param p2 The second point
 * @returns The angle in radians [0, 2*PI]
 */
export function angleBetweenPoints(p1: Point2d, p2: Point2d) {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}
