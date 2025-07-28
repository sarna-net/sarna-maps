import { BorderLabelCandidate } from '../types';
import { distance, lineSegmentIntersection } from '../../../common';
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
    const baselineIntersectionPoint = lineSegmentIntersection(
      { p1: candidate.rect.bl, p2: candidate.rect.br },
      { p1: loopEdge.node1, p2: loopEdge.node2 },
    );
    const baselineIntersectionDistance = baselineIntersectionPoint
      ? Math.max(
        distance(baselineIntersectionPoint, candidate.rect.bl),
        distance(baselineIntersectionPoint, candidate.rect.br)
      ) : 0;
    const leftlineIntersectionPoint = lineSegmentIntersection(
      { p1: candidate.rect.bl, p2: candidate.rect.tl },
      { p1: loopEdge.node1, p2: loopEdge.node2 },
    )
    const leftlineIntersectionDistance = leftlineIntersectionPoint
      ? Math.max(
        distance(leftlineIntersectionPoint, candidate.rect.bl),
        distance(leftlineIntersectionPoint, candidate.rect.br)
      ) : 0;
    const toplineIntersectionPoint = lineSegmentIntersection(
      { p1: candidate.rect.tl, p2: candidate.rect.tr },
      { p1: loopEdge.node1, p2: loopEdge.node2 },
    );
    const toplineIntersectionDistance = toplineIntersectionPoint
      ? Math.max(
        distance(toplineIntersectionPoint, candidate.rect.tl),
        distance(toplineIntersectionPoint, candidate.rect.tr)
      ) : 0;
    const rightlineIntersectionPoint = lineSegmentIntersection(
      { p1: candidate.rect.tr, p2: candidate.rect.br },
      { p1: loopEdge.node1, p2: loopEdge.node2 },
    )
    const rightlineIntersectionDistance = rightlineIntersectionPoint
      ? Math.max(
        distance(rightlineIntersectionPoint, candidate.rect.tr),
        distance(rightlineIntersectionPoint, candidate.rect.br)
      ) : 0;
    candidate.loopOverlapDistance = Math.max(
      candidate.loopOverlapDistance || 0,
      baselineIntersectionDistance,
      toplineIntersectionDistance,
      leftlineIntersectionDistance,
      rightlineIntersectionDistance,
    );
  });
}
