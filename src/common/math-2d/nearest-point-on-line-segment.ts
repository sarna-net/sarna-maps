import { Point2d } from './types';

/**
 * Finds the nearest point on a line segment to the given point.
 *
 * @param p0 Start of the line segment
 * @param p1 End of the line segment
 * @param q The reference point
 * @param clamp True if q should be clamped to the line segment's end points if it cannot be projected
 * @see https://stackoverflow.com/a/64122266
 */
export function nearestPointOnLineSegment(p0: Point2d, p1: Point2d, q: Point2d, clamp = false) {
  if (p0.x == p1.x && p0.y == p1.y) p0.x -= 0.00001;

  const uTop = ((q.x - p0.x) * (p1.x - p0.x)) + ((q.y - p0.y) * (p1.y - p0.y));
  const uBot = Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2);
  const u = uTop / uBot;

  const r = {
    x: p0.x + (u * (p1.x - p0.x)),
    y: p0.y + (u * (p1.y - p0.y))
  }

  const minX = Math.min(p0.x, p1.x);
  const maxX = Math.max(p0.x, p1.x);
  const minY = Math.min(p0.y, p1.y);
  const maxY = Math.max(p0.y, p1.y);

  let isValid = (r.x >= minX && r.x <= maxX) && (r.y >= minY && r.y <= maxY);
  if (!isValid && clamp) {
    if (r.x < minX) {
      r.x = minX;
    } else if (r.x > maxX) {
      r.x = maxX;
    }
    if (r.y < minY) {
      r.y = minY;
    } else if (r.y > maxY) {
      r.y = maxY;
    }
    isValid = true;
  }

  return isValid ? r : null;
}
