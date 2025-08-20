import { Point2d } from './point-2d';

export interface Point2dWithEdgeContext {
  point: Point2d;
  /**
   * The distance to the closest edge end point along the current edge path
   */
  distanceToClosestPoint?: number;
  /**
   * The dot product of the adjacent edges for an edge path point
   * (1 if the edges point in the same direction, 0 if the edges are at 90°, -1 if they are at a 180° angle)
   */
  adjacentEdgesDotProduct?: number;
}
