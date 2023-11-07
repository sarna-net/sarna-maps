import { Point2d } from './types';

/**
 * Checks for point equality.
 *
 * @param p1 The first point
 * @param p2 The second point
 * @returns true if the points are equal (euclidean distance is 0)
  */
export function pointsAreEqual(p1: Point2d, p2: Point2d): boolean {
  return p1.x === p2.x && p1.y === p2.y;
}
