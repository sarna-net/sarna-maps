import { BezierEdge2d, Point2d, Point2dWithEdgeContext } from './types';
import { pointOnCubicBezierCurve } from './point-on-cubic-bezier-curve';
import { pointOnLine } from './point-on-line';
import { pointOnQuadraticBezierCurve } from './point-on-quadratic-bezier-curve';
import { distance } from './distance';
import { normalizeVector } from './normalize-vector';
import { dotProduct } from './dot-product';

/**
 * Get the point on the given edge path (ordered sequence of edges) that lies at the provided distance, where the first
 * edge's first edge point is at distance 0.
 * Note that the function does not wrap around, i.e. it only returns a point if dist <= edge path length.
 *
 * @param edgePath The ordered edge sequence
 * @param dist The distance at which to look for a point on the edge path
 * @param includeEdgeInfo set to true to include context information, specifically the point's distance to the next edge point and the angle of the adjacent edges
 */
export function pointAlongEdgePath(
  edgePath: Array<BezierEdge2d>,
  dist: number,
  includeEdgeInfo = false,
): Point2dWithEdgeContext | undefined {
  let currentEdge: BezierEdge2d;
  let remainingDistance = dist;
  for (let edgeI = 0; edgeI < edgePath.length; edgeI++) {
    currentEdge = edgePath[edgeI];
    if ((currentEdge.length || 0) < remainingDistance) {
      // the point lies beyond the current edge
      // subtract the current edge's length from the remaining distance and continue with the next edge
      remainingDistance -= currentEdge.length || 0;
    } else {
      // the point lies on the current edge

      let pointOnEdge: Point2d;
      if (currentEdge.p1c2 !== undefined && currentEdge.p2c1 !== undefined) {
        // the current edge has two defined control points and is a cubic bezier curve
        pointOnEdge = pointOnCubicBezierCurve(
          currentEdge.p1,
          (currentEdge.p1c2 || currentEdge.p2c1) as Point2d,
          (currentEdge.p2c1 || currentEdge.p1c2) as Point2d,
          currentEdge.p2,
          remainingDistance / (currentEdge.length || 1),
        );
      } else if (currentEdge.p1c2 !== undefined || currentEdge.p2c1 !== undefined) {
        // the current edge has one defined control points and is a quadratic bezier curve
        pointOnEdge = pointOnQuadraticBezierCurve(
          currentEdge.p1,
          (currentEdge.p1c2 || currentEdge.p2c1) as Point2d,
          currentEdge.p2,
          remainingDistance / (currentEdge.length || 1),
        );
      } else {
        // the current edge has no control points, treat it as a line
        pointOnEdge = pointOnLine(currentEdge.p1, currentEdge.p2, remainingDistance);
      }
      // if necessary, also return the distance to the closest point and the
      // angle between the edges adjacent to that point
      if (includeEdgeInfo) {
        const p1Distance = distance(currentEdge.p1, pointOnEdge);
        const p2Distance = distance(currentEdge.p2, pointOnEdge);
        let adjacentEdgesDotProduct= 0;
        let distanceToClosestPoint = 0;
        let edgePoints: [Point2d, Point2d, Point2d];
        if (p1Distance <= p2Distance) {
          // p1 is the closest point, meaning that the adjacent edges are the previous edge and the current one
          distanceToClosestPoint = p1Distance;
          const previousEdge = edgePath[(edgeI - 1 + edgePath.length) % edgePath.length];
          edgePoints = [previousEdge.p1, currentEdge.p1, currentEdge.p2];
        } else {
          // p2 is the closest point, meaning that the adjacent edges are the current edge and the next one
          distanceToClosestPoint = p2Distance;
          const nextEdge = edgePath[(edgeI + 1) % edgePath.length];
          edgePoints = [currentEdge.p1, currentEdge.p2, nextEdge.p2];
        }
        const vec1 = { a: edgePoints[0].x - edgePoints[1].x, b: edgePoints[0].y - edgePoints[1].y };
        const vec2 = { a: edgePoints[2].x - edgePoints[1].x, b: edgePoints[2].y - edgePoints[1].y };
        normalizeVector(vec1);
        normalizeVector(vec2);
        adjacentEdgesDotProduct = dotProduct(vec1, vec2);
        return {
          point: pointOnEdge,
          adjacentEdgesDotProduct,
          distanceToClosestPoint,
        }
      }
      return { point: pointOnEdge };
    }
  }
  return;
}
