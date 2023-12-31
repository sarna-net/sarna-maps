import { Point2d } from './types';

/**
 * Calculates the euclidean distance between to points in 2D space.
 *
 * @param p1 The first point
 * @param p2 The second point
 * @returns The distance
 */
export function distance(p1: Point2d, p2: Point2d): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}
