import { lineLineIntersection } from './line-line-intersection';
import { perpendicularBisector } from './perpendicular-bisector';
import { Point2d } from './types';
/**
 * Calculates a triangle's circumcenter.
 *
 * @param p1 The triangle's first vertex
 * @param p2 The triangle's second vertex
 * @param p3 The triangle's third vertex
 * @returns The circumcenter point, or null if no circumcenter can be calculated
 */
export function triangleCircumcenter(
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

/**
 * Calculates a triangle's circumcenter (alternative implementation).
 *
 * @param p1 The triangle's first vertex
 * @param p2 The triangle's second vertex
 * @param p3 The triangle's third vertex
 * @returns The circumcenter point, or null if no circumcenter can be calculated
 */
export function triangleCircumcenterAlternativeImplementation(
  p1: Point2d,
  p2: Point2d,
  p3: Point2d,
): Point2d | null {
  const ad = p1.x * p1.x + p1.y * p1.y;
  const bd = p2.x * p2.x + p2.y * p2.y;
  const cd = p3.x * p3.x + p3.y * p3.y;
  const D = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
  const xD = D * (ad * (p2.y - p3.y) + bd * (p3.y - p1.y) + cd * (p1.y - p2.y));
  const yD = D * (ad * (p3.x - p2.x) + bd * (p1.x - p3.x) + cd * (p2.x - p1.x));
  return xD === 0 || yD === 0
    ? null
    : {
      x: 1 / xD,
      y: 1 / yD,
    };
}
