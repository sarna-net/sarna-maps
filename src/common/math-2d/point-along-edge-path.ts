import { BezierEdge2d, Point2d } from './types';
import { pointOnCubicBezierCurve } from './point-on-cubic-bezier-curve';
import { pointOnLine } from './point-on-line';
import { pointOnQuadraticBezierCurve } from './point-on-quadratic-bezier-curve';

export function pointAlongEdgePath(edgePath: Array<BezierEdge2d>, dist: number): Point2d | undefined {
  let currentEdge: BezierEdge2d;
  let remainingDistance = dist;
  for (let i = 0; i < edgePath.length; i++) {
    currentEdge = edgePath[i];
    if ((currentEdge.length || 0) < remainingDistance) {
      // the point lies beyond the current edge
      // subtract the current edge's length from the remaining distance and continue with the next edge
      remainingDistance -= currentEdge.length || 0;
    } else {
      // the point lies on the current edge
      if (currentEdge.p1c2 !== undefined && currentEdge.p2c1 !== undefined) {
        // the current edge has two defined control points and is a cubic bezier curve
        return pointOnCubicBezierCurve(
          currentEdge.p1,
          (currentEdge.p1c2 || currentEdge.p2c1) as Point2d,
          (currentEdge.p2c1 || currentEdge.p1c2) as Point2d,
          currentEdge.p2,
          remainingDistance / (currentEdge.length || 1),
        );
      } else if (currentEdge.p1c2 !== undefined || currentEdge.p2c1 !== undefined) {
        // the current edge has one defined control points and is a quadratic bezier curve
        return pointOnQuadraticBezierCurve(
          currentEdge.p1,
          (currentEdge.p1c2 || currentEdge.p2c1) as Point2d,
          currentEdge.p2,
          remainingDistance / (currentEdge.length || 1),
        );
      } else {
        // the current edge has no control points, treat it as a line
        return pointOnLine(currentEdge.p1, currentEdge.p2, remainingDistance);
      }
    }
  }
  return;
}
