import { Point2d } from './types';

/**
 * Calculate the area of the given polygon.
 *
 * @param pPoints An array of polygon points
 * @see http://www.mathopenref.com/coordpolygonarea2.html
 */
export function areaOfPolygon(pPoints: Array<Point2d>) {
  let area = 0;
  if (pPoints.length === 0) {
    return area;
  }
  let j = pPoints.length - 1;
  for (let i = 0; i < pPoints.length; i++) {
    area += (pPoints[j].x+pPoints[i].x) * (pPoints[j].y-pPoints[i].y);
    j = i;
  }
  return area * .5;
}
