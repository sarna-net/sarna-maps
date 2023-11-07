import { Point2d, Rectangle2d } from './types';
import { clampNumber } from '../utils';

/**
 * Returns closest point to p on rectangle's perimeter
 * https://stackoverflow.com/questions/20453545/how-to-find-the-nearest-point-in-the-perimeter-of-a-rectangle-to-a-given-point
 *
 * @param p The point
 * @param rect The rectangle
 * @param distFromCorner The minimum distance from a rectangle corner
 * @returns The closest point
 */
export function nearestPointOnRectanglePerimeter(p: Point2d, rect: Rectangle2d, distFromCorner = 0) {
  const left = rect.anchor.x;
  const right = left + rect.dimensions.width;
  const bottom = rect.anchor.y;
  const top = bottom + rect.dimensions.height;

  const x = clampNumber(p.x, left, right);
  const y = clampNumber(p.y, bottom, top);

  const dl = Math.abs(x - left);
  const dr = Math.abs(x - right);
  const db = Math.abs(y - bottom);
  const dt = Math.abs(y - top);

  const m = Math.min(dl, dr, dt, db);

  let ret: Point2d;
  switch(m) {
    case dt:
      ret = { x: x, y: top };
      break;
    case db:
      ret = { x: x, y: bottom };
      break;
    case dl:
      ret = { x: left, y: y };
      break;
    case dr:
      ret = { x: right, y: y };
      break;
    default:
      ret = { x: left, y: top };
  }

  if(ret.x === left || ret.x === right) {
    ret.y = clampNumber(ret.y, bottom + distFromCorner, top - distFromCorner);
  } else if(ret.y === top || ret.y === bottom) {
    ret.x = clampNumber(ret.x, left + distFromCorner, right - distFromCorner);
  }

  return ret;
}
