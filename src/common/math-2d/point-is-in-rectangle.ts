import { Point2d, Rectangle2d } from './types';

export function pointIsInRectangle(point: Point2d, rectangle: Rectangle2d) {
  return point.x >= rectangle.anchor.x &&
    point.x <= (rectangle.anchor.x + rectangle.dimensions.width) &&
    point.y >= rectangle.anchor.y &&
    point.y <= (rectangle.anchor.y + rectangle.dimensions.height);
}
