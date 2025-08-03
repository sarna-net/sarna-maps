import { Point2d, Rectangle2d } from './types';

/**
 * Clamp a point to a given rectangle, in-place.
 *
 * @param point The point (will be modified)
 * @param rect The rectangle
 */
export function clampPointToRectangle(point: Point2d, rect: Rectangle2d) {
  point.x = Math.min(Math.max(point.x, rect.anchor.x), rect.anchor.x + rect.dimensions.width);
  point.y = Math.min(Math.max(point.y, rect.anchor.y), rect.anchor.y + rect.dimensions.height);
}
