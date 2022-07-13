import lineFromPoints from './line-from-points';
import Line2d from './types/line-2d';
import Point2d from './types/point-2d';

/**
 * Calculates the perpendicular bisector of the line between two 2D points.
 *
 * @param p1 The first point
 * @param p2 The second point
 * @returns The perpendicular bisector, a line expressed as ax + by = c
 */
export default function perpendicularBisector(p1: Point2d, p2: Point2d): Line2d {
  const line = lineFromPoints(p1, p2);
  const midPoint = { x: (p1.x + p2.x) * 0.5, y: (p1.y + p2.y) * 0.5 };

  // -bx + ay = c is perpendicular to ax + by = c
  return {
    a: -line.b,
    b: line.a,
    c: -line.b * midPoint.x + line.a * midPoint.y,
  };
}
