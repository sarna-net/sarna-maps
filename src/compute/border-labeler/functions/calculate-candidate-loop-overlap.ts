import { BorderLabelCandidate } from '../types';
import { distance, lineSegmentIntersection, Point2d, pointAlongEdgePath, pointIsLeftOfLine } from '../../../common';
import { BorderEdgeLoop } from '../../voronoi-border';

/**
 * Calculate a border label candidate's loopOverlapDistance field. The field is the approximate number of units
 * that the candidate intersects "past" its edge loop.
 *
 * @param candidate The border label candidate
 * @param loop The edge loop
 */
export function calculateCandidateLoopOverlap(candidate: BorderLabelCandidate, loop: BorderEdgeLoop) {
  candidate.loopOverlapDistance = 0;

  loop.edges.forEach((loopEdge) => {
    let intersectionDistance = 0;
    const midPoint = pointAlongEdgePath([{
      p1: loopEdge.node1,
      p2: loopEdge.node2,
      p1c2: loopEdge.n1c2,
      p2c1: loopEdge.n2c1,
      length: loopEdge.length,
    }], loopEdge.length * 0.5);
    if (candidate.id === 'candidate-OA-L0-58') {
      console.log(candidate.id, 'mid point', midPoint);
    }
    // For curves, check the two edges from the endpoints to the midpoint.
    // For straight edges, just use the two endpoints
    intersectionDistance = midPoint
      ? Math.max(
          getIntersectionDistance(candidate, [loopEdge.node1, midPoint], !!loop.isInnerLoop),
          getIntersectionDistance(candidate, [midPoint, loopEdge.node2], !!loop.isInnerLoop),
        )
      : getIntersectionDistance(candidate, [loopEdge.node1, loopEdge.node2], !!loop.isInnerLoop);

    candidate.loopOverlapDistance = Math.max(candidate.loopOverlapDistance || 0, intersectionDistance);
  });
}

/**
 * Calculate the intersection distance of a candidate and an edge defined by two points
 */
function getIntersectionDistance(
  candidate: BorderLabelCandidate,
  edgePoints: [Point2d, Point2d],
  isInnerLoop: boolean
) {

  // private helper function
  const getMaxIntersectionDistance = (
    points: [Point2d, Point2d],
    edgePoints: [Point2d, Point2d],
    intersectionPoint: Point2d,
  ) =>
    Math.max(
      ...points.filter(
        (point) => {
          const leftOfLine = pointIsLeftOfLine(point, edgePoints[0], edgePoints[1]);
          return (isInnerLoop && !leftOfLine) || (!isInnerLoop && leftOfLine);
        }
      ).map((point) => distance(point, intersectionPoint))
    );

  const baselineIntersectionPoint = lineSegmentIntersection(
    { p1: candidate.rect.bl, p2: candidate.rect.br },
    { p1: edgePoints[0], p2: edgePoints[1] },
  );
  const baselineIntersectionDistance = baselineIntersectionPoint
    ? getMaxIntersectionDistance([candidate.rect.bl, candidate.rect.br], edgePoints, baselineIntersectionPoint)
    : 0;
  const leftlineIntersectionPoint = lineSegmentIntersection(
    { p1: candidate.rect.bl, p2: candidate.rect.tl },
    { p1: edgePoints[0], p2: edgePoints[1] },
  );
  const leftlineIntersectionDistance = leftlineIntersectionPoint
    ? getMaxIntersectionDistance([candidate.rect.bl, candidate.rect.tl], edgePoints, leftlineIntersectionPoint)
    : 0;
  const toplineIntersectionPoint = lineSegmentIntersection(
    { p1: candidate.rect.tl, p2: candidate.rect.tr },
    { p1: edgePoints[0], p2: edgePoints[1] },
  );
  const toplineIntersectionDistance = toplineIntersectionPoint
    ? getMaxIntersectionDistance([candidate.rect.tl, candidate.rect.tr], edgePoints, toplineIntersectionPoint)
    : 0;
  const rightlineIntersectionPoint = lineSegmentIntersection(
    { p1: candidate.rect.tr, p2: candidate.rect.br },
    { p1: edgePoints[0], p2: edgePoints[1] },
  );
  const rightlineIntersectionDistance = rightlineIntersectionPoint
    ? getMaxIntersectionDistance([candidate.rect.tr, candidate.rect.br], edgePoints, rightlineIntersectionPoint)
    : 0;

  return Math.max(
    baselineIntersectionDistance,
    toplineIntersectionDistance,
    leftlineIntersectionDistance,
    rightlineIntersectionDistance,
  );
}
