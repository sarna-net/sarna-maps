import { Ellipse2d, Point2d } from './types';
import { lineEllipseIntersection } from './line-ellipse-intersection';
import { distance } from './distance';

/**
 * Returns closest point to p on ellipse's perimeter
 *
 * @param p The point
 * @param ellipse The ellipse (centerX, centerY, radiusX, radiusY)
 * @returns The closest point
 */
export function nearestPointOnEllipsePerimeter (p: Point2d, ellipse: Ellipse2d) {
  const iPoints = lineEllipseIntersection([p, ellipse.center], ellipse);

  if (iPoints.length === 0) {
    return null;
  } else if (iPoints.length === 1) {
    return iPoints[0];
  } else {
    const d0 = distance(p, iPoints[0]);
    const d1 = distance(p, iPoints[1]);
    if(d0 < d1) {
      return iPoints[0];
    } else {
      return iPoints[1];
    }
  }
}
