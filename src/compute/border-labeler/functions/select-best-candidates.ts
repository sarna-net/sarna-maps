import { BorderLabelCandidate } from '../types';
import { BorderLabelConfig, distance } from '../../../common';

export function selectBestCandidates(candidates: Array<BorderLabelCandidate>, borderLabelConfig: BorderLabelConfig) {
  const remainingCandidates = candidates
    .filter((candidate) =>
      !candidate.disqualified && candidate.score >= borderLabelConfig.rules.minViableScore
    )
    .sort((a, b) => b.score - a.score);
  for (let i = 0; i < remainingCandidates.length; i++) {
    for (let j = 0; j < i; j++) {
      if (!remainingCandidates[j].disqualified &&
        (
          distance(
            remainingCandidates[j].anchorPoint, remainingCandidates[i].anchorPoint
          ) < borderLabelConfig.rules.minDistanceBetweenLabels ||
          Math.abs(
            remainingCandidates[j].positionOnEdgeLoop - remainingCandidates[i].positionOnEdgeLoop
          ) < borderLabelConfig.rules.minLoopDistanceBetweenLabels
        )
      ) {
        remainingCandidates[i].disqualified = true;
        break;
      }
    }
    // this candidate will not be disqualified, which means it will be placed on the map
  }
  return remainingCandidates.filter((candidate) => !candidate.disqualified);
}
