import { BorderLabelCandidate } from '../types';
import { BorderLabelConfig, distance, RectangleGrid } from '../../../common';

export function selectBestCandidates(
  candidates: Array<BorderLabelCandidate>,
  borderLabelConfig: BorderLabelConfig,
  grid: RectangleGrid
) {
  const remainingCandidates = candidates
    .filter((candidate) =>
      !candidate.disqualified && candidate.score >= borderLabelConfig.rules.minViableScore
    )
    .sort((a, b) => b.score - a.score);
  for (let i = 0; i < remainingCandidates.length; i++) {
    const candidateGridItem = {
      id: remainingCandidates[i].id,
      anchor: { ...remainingCandidates[i].anchorPoint },
      dimensions: { width: 1, height: 1 },
    };
    const candidateSearchArea = {
      id: remainingCandidates[i].id + '-search-area',
      anchor: {
        x: remainingCandidates[i].anchorPoint.x - borderLabelConfig.rules.minDistanceBetweenLabels,
        y: remainingCandidates[i].anchorPoint.y - borderLabelConfig.rules.minDistanceBetweenLabels,
      },
      dimensions: {
        width: borderLabelConfig.rules.minDistanceBetweenLabels * 2,
        height: borderLabelConfig.rules.minDistanceBetweenLabels * 2
      },
    };
    for (let j = 0; j < i; j++) {
      if (!remainingCandidates[j].disqualified &&
        Math.abs(remainingCandidates[j].positionOnEdgeLoop - remainingCandidates[i].positionOnEdgeLoop)
        < borderLabelConfig.rules.minDistanceBetweenLabels
      ) {
        remainingCandidates[i].disqualified = true;
        remainingCandidates[i].disqualificationReason = `edge loop distance to other candidate is too small (${remainingCandidates[j].id})`
        break;
      }
    }

    const overlaps = grid.getOverlaps(candidateSearchArea);
    overlaps.some((overlap) => {
      if (distance(remainingCandidates[i].anchorPoint, overlap.anchor) < borderLabelConfig.rules.minDistanceBetweenLabels) {
        remainingCandidates[i].disqualified = true;
        remainingCandidates[i].disqualificationReason = `distance to other candidate is too small (${overlap.id})`
        return true;
      }
      return false;
    });
    // this candidate will not be disqualified, which means it will be placed on the map
    if (!remainingCandidates[i].disqualified) {
      grid.placeItem(candidateGridItem);
    }
  }
  return remainingCandidates.filter((candidate) => !candidate.disqualified);
}
