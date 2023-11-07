import { Line2d, Point2d } from './types';

/**
 * Returns the euclidean distance between a point (the closest point on) a line.
 *
 * @param point The point
 * @param line The line, represented as ax + by = c
 * @see https://brilliant.org/wiki/dot-product-distance-between-point-and-a-line/
 */
export function distancePointToLine(point: Point2d, line: Line2d) {
  return Math.abs(line.a * point.x + line.b * point.y - line.c) / Math.sqrt(line.a * line.a + line.b * line.b);
}
