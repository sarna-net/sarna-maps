import { BorderLabelCandidate } from '../types';
import {
  areaOfPolygon,
  areaOfRotatedRectangleIntersection,
  IdentifiableRectangle,
  RectangleGrid
} from '../../../common';

/**
 * Calculate a border label candidate's labelOverlapArea field. The field contains the sum of the areas
 * of already placed objects or labels which overlap with the candidate.
 *
 * @param candidate The border label candidate
 * @param grid The grid containing already placed objects and labels
 */
export function calculateCandidateLabelOverlap(candidate: BorderLabelCandidate, grid: RectangleGrid) {
  candidate.labelOverlapArea = 0;
  const left = Math.min(candidate.rect.bl.x, candidate.rect.tl.x, candidate.rect.tr.x, candidate.rect.br.x);
  const bottom = Math.min(candidate.rect.bl.y, candidate.rect.tl.y, candidate.rect.tr.y, candidate.rect.br.y);
  const right = Math.max(candidate.rect.bl.x, candidate.rect.tl.x, candidate.rect.tr.x, candidate.rect.br.x);
  const top = Math.max(candidate.rect.bl.y, candidate.rect.tl.y, candidate.rect.tr.y, candidate.rect.br.y);
  const bbox: IdentifiableRectangle = {
    id: candidate.id,
    anchor: {
      x: left,
      y: bottom,
    },
    dimensions: {
      width: right - left,
      height: top - bottom,
    },
  }

  const overlaps = grid.getOverlaps(bbox);
  overlaps.forEach((overlap) => {
    const intersectionResult = areaOfRotatedRectangleIntersection(overlap, candidate.rect);
    candidate.labelOverlapArea = (candidate.labelOverlapArea || 0) + areaOfPolygon(intersectionResult.p);
    if (candidate.labelOverlapArea > 0) {
      candidate.overlapPolygons = candidate.overlapPolygons || [];
      candidate.overlapPolygons.push(intersectionResult.p);
    }
  });
}
