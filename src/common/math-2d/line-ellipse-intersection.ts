import { Ellipse2d, Point2d } from './types';

/**
 * Returns intersection points of a line with an ellipse.
 * http://csharphelper.com/blog/2017/08/calculate-where-a-line-segment-and-an-ellipse-intersect-in-c/
 * https://stackoverflow.com/questions/1073336/circle-line-segment-collision-detection-algorithm
 *
 * @param lineSegment The line segment, defined by two points
 * @param ellipse {Object} The ellipse (centerX, centerY, radiusX, radiusY)
 * @param enforceSegment Limit intersection points to the given segment
 * @returns List of intersection points
 */
export function lineEllipseIntersection(lineSegment: [Point2d, Point2d], ellipse: Ellipse2d, enforceSegment = false) {
  // consider the ellipse to be centered at origin for now
  const p1 = { x: lineSegment[0].x - ellipse.center.x, y: lineSegment[0].y - ellipse.center.y };
  const p2 = { x: lineSegment[1].x - ellipse.center.x, y: lineSegment[1].y - ellipse.center.y };
  const ts: Array<number> = [];
  const ret: Array<Point2d> = [];

  // semimajor and semiminor axes
  const aSquared = ellipse.radiusX ** 2;
  const bSquared = ellipse.radiusY ** 2;

  // calculate quadratic parameters
  const quadA = (p2.x - p1.x) ** 2 / aSquared + (p2.y - p1.y) ** 2 / bSquared;
  const quadB = 2 * p1.x * (p2.x - p1.x) / aSquared + 2 * p1.y * (p2.y - p1.y) / bSquared;
  const quadC = p1.x ** 2 / aSquared + p1.y ** 2 / bSquared - 1;

  // calculate discriminant
  const discriminant = quadB * quadB - 4 * quadA * quadC;
  if(discriminant === 0) {
    // one real solution
    ts.push(-quadB / (2 * quadA));
  } else if(discriminant > 0) {
    // two real solutions
    ts.push((-quadB + Math.sqrt(discriminant)) / (2 * quadA));
    ts.push((-quadB - Math.sqrt(discriminant)) / (2 * quadA));
  } else {
    // no intersection
  }

  // convert t values into points and translate to actual ellipse location
  for(var i = 0, len = ts.length; i < len; i++) {
    if (enforceSegment && (ts[i] < 0 || ts[i] > 1)) {
      continue;
    }
    ret.push({
      x: p1.x + (p2.x - p1.x) * ts[i] + ellipse.center.x,
      y: p1.y + (p2.y - p1.y) * ts[i] + ellipse.center.y,
    });
  }
  return ret;
}
