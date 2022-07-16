import { Point2d } from './types/point-2d';

/**
 * Checks if a given point lies to the left of a line.
 *
 * @param p The point to check
 * @param lineStart First point of the line
 * @param lineEnd Second point of the line
 * @returns true if the point lies to the line's left, false if it lies to the right
 * @see http://alienryderflex.com/point_left_of_ray/
 */
export function pointIsLeftOfLine(
  p: Point2d,
  lineStart: Point2d,
  lineEnd: Point2d,
) {
  return (p.y - lineStart.y) * (lineEnd.x - lineStart.x)
    > (p.x - lineStart.x) * (lineEnd.y - lineStart.y);
}
