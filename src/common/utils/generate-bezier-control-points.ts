import { distance, Point2d } from '../math-2d';

/**
 * Helper function that generates bezier control points c1 and c2 for the middle of three points.
 *
 * @param p1 The point preceding the middle point
 * @param p2 The middle point
 * @param p3 The point following the middle point
 * @param tension Control point tension (more tension = control points will be pulled harder towards the neighbors)
 */
export function generateBezierControlPoints(p1: Point2d, p2: Point2d, p3: Point2d, tension: number) {
  const dist12 = distance(p1, p2);
  const dist23 = distance(p2, p3);

  // generate two control points for the looked at point (p2)
  // see http://walter.bislins.ch/blog/index.asp?page=JavaScript%3A+Bezier%2DSegmente+f%FCr+Spline+berechnen
  const fa = tension * dist12 / (dist12 + dist23);
  const fb = tension * dist23 / (dist12 + dist23);

  const w = p3.x - p1.x;
  const h = p3.y - p1.y;

  return {
    c1: {
      x: p2.x - fa * w,
      y: p2.y - fa * h,
    },
    c2: {
      x: p2.x + fb * w,
      y: p2.y + fb * h,
    },
  }
}
