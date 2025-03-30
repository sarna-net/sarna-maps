import { Edge2d, Point2d } from './types';
import { lineFromPoints } from './line-from-points';
import { lineLineIntersection } from './line-line-intersection';

export function lineSegmentIntersection(segment1: Edge2d, segment2: Edge2d) {
  const line1 = lineFromPoints(segment1.p1, segment1.p2);
  const line2 = lineFromPoints(segment2.p1, segment2.p2);
  const intersectionCandidate = lineLineIntersection(line1, line2);
  if (
    intersectionCandidate &&
    pointIsOnSegment(intersectionCandidate, segment1) &&
    pointIsOnSegment(intersectionCandidate, segment2)
  ) {
    return intersectionCandidate;
  }
  return null;
}

/**
 * Helper function - note that this only works if the point has already been established to be on the line that
 * the segment belongs to.
 *
 * @param point The point
 * @param segment The segment to check
 */
export function pointIsOnSegment(point: Point2d, segment: Edge2d) {
  return Math.min(segment.p1.x, segment.p2.x) <= point.x && point.x <= Math.max(segment.p1.x, segment.p2.x)
    && Math.min(segment.p1.y, segment.p2.y) <= point.y && point.y <= Math.max(segment.p1.y, segment.p2.y);
}
