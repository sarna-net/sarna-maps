import { Line2d, Point2d } from './types';

/**
 * Creates a line in 2D space from two points.
 *
 * @param p1 A 2D point
 * @param p2 A 2D point
 * @returns The line, represented as ax + by = c
 */
export function lineFromPoints(p1: Point2d, p2: Point2d): Line2d {
  const line = {
    a: p2.y - p1.y,
    b: p1.x - p2.x,
    c: 0,
  };
  line.c = line.a * p1.x + line.b * p1.y;
  return line;
}
