import { Point2d } from './types';
import { pointOnCubicBezierCurve } from './point-on-cubic-bezier-curve';
import { pointOnLine } from './point-on-line';

// TODO use bezier edge 2d from types -> node1 and node2 need to be renamed
interface Edge {
  node1: Point2d;
  node2: Point2d;
  length: number;
  n1c1?: Point2d;
  n1c2?: Point2d;
  n2c1?: Point2d;
  n2c2?: Point2d;
}

export function pointAlongEdgePath(edgePath: Array<Edge>, dist: number): Point2d | undefined {
  let currentEdge: Edge;
  let remainingDistance = dist;
  for (let i = 0; i < edgePath.length; i++) {
    currentEdge = edgePath[i];
    if (currentEdge.length < remainingDistance) {
      // the point lies beyond the current edge
      // subtract the current edge's length from the remaining distance and continue with the next edge
      remainingDistance -= currentEdge.length;
    } else {
      // the point lies on the current edge
      if (currentEdge.n1c2 !== undefined || currentEdge.n2c1 !== undefined) {
        // the current edge has at least one defined control point and is a bezier curve
        return pointOnCubicBezierCurve(
          currentEdge.node1,
          (currentEdge.n1c2 || currentEdge.n2c1) as Point2d,
          (currentEdge.n2c1 || currentEdge.n1c2) as Point2d,
          currentEdge.node2,
          remainingDistance / currentEdge.length,
        );
      } else {
        // the current edge has no control points, treat it as a line
        return pointOnLine(currentEdge.node1, currentEdge.node2, remainingDistance);
      }
    }
  }
  return;
}
