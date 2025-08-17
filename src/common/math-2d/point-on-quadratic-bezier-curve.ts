import { Point2d } from './types';

/**
 * Finds a point along a quadratic bezier curve.
 *
 * @param p0 The bezier start point
 * @param p1 The bezier control point
 * @param p2 The bezier end point
 * @param t How far along the curve to look (0 <= t <= 1)
 */
export function pointOnQuadraticBezierCurve(p0: Point2d, p1: Point2d, p2: Point2d, t: number) {
  return {
    x: Math.pow(1 - t, 2) * p0.x + 2 * (1 - t) * t * p1.x + Math.pow(t, 2) * p2.x,
    y: Math.pow(1 - t, 2) * p0.y + 2 * (1 - t) * t * p1.y + Math.pow(t, 2) * p2.y,
  };
}
