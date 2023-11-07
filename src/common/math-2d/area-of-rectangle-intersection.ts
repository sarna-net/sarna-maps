import { Rectangle2d } from './types';

/**
 * Returns the area (= size) of the intersection of two rectangles.
 *
 * @param r1 The first rectangle
 * @param r2 The second rectangle
 */
export function areaOfRectangleIntersection(r1: Rectangle2d, r2: Rectangle2d) {
  if( r1.anchor.x < r2.anchor.x + r2.dimensions.width
    && r1.anchor.x + r1.dimensions.width > r2.anchor.x
    && r1.anchor.y < r2.anchor.y + r2.dimensions.height
    && r1.anchor.y + r1.dimensions.height > r2.anchor.y ) {
    const left = Math.max(r1.anchor.x, r2.anchor.x);
    const right = Math.min(r1.anchor.x + r1.dimensions.width, r2.anchor.x + r2.dimensions.width);
    const bottom = Math.max(r1.anchor.y, r2.anchor.y);
    const top = Math.min(r1.anchor.y + r1.dimensions.height, r2.anchor.y + r2.dimensions.height);
    return (right - left) * (top - bottom);
  }
  return 0;
}
