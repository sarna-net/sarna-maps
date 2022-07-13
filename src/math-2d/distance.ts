import Point2d from './types/point-2d';

/**
 * Calculates the euclidean distance between to points in 2D space.
 *
 * @param p1 The first point
 * @param p2 The second point
 * @returns The distance
 */
export default function distance(p1: Point2d, p2: Point2d): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p2.y) ** 2);
}
