import Line2d from './types/line-2d';
import Point2d from './types/point-2d';

/**
 * Calculates the intersection point of two lines in 2D space.
 *
 * @param line1 The first line, expressed as ax + by = c
 * @param line2 The second line, expressed as ax + by = c
 * @returns The intersection point, or null if the lines are parallel
 */
export default function lineLineIntersection(line1: Line2d, line2: Line2d): Point2d | null {
  const determinant = line1.a * line2.b - line2.a * line1.b;
  if (determinant === 0) {
    // lines are parallel
    return null;
  }
  return {
    x: (line2.b * line1.c - line1.b * line2.c) / determinant,
    y: (line1.a * line2.c - line2.a * line1.c) / determinant
  };
}
