import lineLineIntersection from './line-line-intersection';
import perpendicularBisector from './perpendicular-bisector';
import Point2d from './types/point-2d';

/**
 * Calculates a triangle's circumcenter.
 *
 * @param p1 The triangle's first vertex
 * @param p2 The triangle's second vertex
 * @param p3 The triangle's third vertex
 * @returns The circumcenter point, or null if no circumcenter can be calculated
 */
export default function triangleCircumcenter(
  p1: Point2d,
  p2: Point2d,
  p3: Point2d,
): Point2d | null {
  // Convert the two lines to perpendicular bisectors.
  const abc = perpendicularBisector(p1, p2);
  const efg = perpendicularBisector(p2, p3);

  // The point of intersection between the two perpendicular bisectors
  // gives the circumcenter.
  return lineLineIntersection(abc, efg);
}
