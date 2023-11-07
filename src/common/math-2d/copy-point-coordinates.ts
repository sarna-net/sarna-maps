import { Point2d } from './types';

/**
 * Modifies the second point by setting it to the first point's coordinates.
 *
 * @param point1 The first point (copy source)
 * @param point2 The second point (copy target)
 */
export function copyPointCoordinates(point1: Point2d, point2: Point2d) {
  point2.x = point1.x;
  point2.y = point1.y;
}
