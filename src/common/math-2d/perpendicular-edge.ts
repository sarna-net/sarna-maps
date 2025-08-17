import { Edge2d, Point2d, Vector2d } from './types';
import { scaleVector } from './scale-vector';

export function perpendicularEdge(edge: Edge2d, length = 1, direction: 'any' | 'left' | 'right' = 'any'): Edge2d {
  const perpendicularSlope = edge.p2.y === edge.p1.y ? Infinity : -((edge.p2.x - edge.p1.x) / (edge.p2.y - edge.p1.y));
  const midPoint: Point2d = { x: 0.5 * (edge.p1.x + edge.p2.x), y: 0.5 * (edge.p1.y + edge.p2.y) };
  const p2Vec: Vector2d = perpendicularSlope === Infinity ? { a: 0, b: 1 } : { a: 1, b: perpendicularSlope };
  scaleVector(p2Vec, length);
  if (
    (direction === 'right' && (edge.p2.y < edge.p1.y || (edge.p2.y === edge.p1.y && edge.p2.x > edge.p1.x))) ||
    (direction === 'left' && (edge.p2.y > edge.p1.y || (edge.p2.y === edge.p1.y && edge.p2.x < edge.p1.x)))
  ) {
    p2Vec.a *= -1;
    p2Vec.b *= -1;
  }
  return {
    p1: midPoint,
    p2: {
      x: midPoint.x + p2Vec.a,
      y: midPoint.y + p2Vec.b,
    }
  }
}
