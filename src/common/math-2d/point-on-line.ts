import { Point2d } from './types';
import { scaleVector } from './scale-vector';

export function pointOnLine(p1: Point2d, p2: Point2d, distance: number): Point2d {
  const vector = {
    a: p2.x - p1.x,
    b: p2.y - p1.y
  };
  scaleVector(vector, distance);
  return {
    x: p1.x + vector.a,
    y: p1.y + vector.b,
  };
}
