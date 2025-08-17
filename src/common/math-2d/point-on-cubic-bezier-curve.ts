import { Point2d } from './types';

/**
 * Finds a point along a cubic bezier curve.
 *
 * @param p0 The bezier start point
 * @param p1 The first bezier control point
 * @param p2 The second bezier control point
 * @param p3 The bezier end point
 * @param t How far along the curve to look (0 <= t <= 1)
 */
export function pointOnCubicBezierCurve(p0: Point2d, p1: Point2d, p2: Point2d, p3: Point2d, t: number) {
  return {
    x: Math.pow((1-t), 3) * p0.x + 3 * t * Math.pow((1-t), 2) * p1.x + 3 * t * t * (1-t) * p2.x + Math.pow(t, 3) * p3.x,
    y: Math.pow((1-t), 3) * p0.y + 3 * t * Math.pow((1-t), 2) * p1.y + 3 * t * t * (1-t) * p2.y + Math.pow(t, 3) * p3.y,
  };
}
