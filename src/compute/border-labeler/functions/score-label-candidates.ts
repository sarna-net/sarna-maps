import { BorderLabelCandidate } from "../types";
import { BorderEdgeLoop } from '../../voronoi-border';
import { BorderLabelConfig, BorderLabelVariant, RectangleGrid } from '../../../common';
import { calculateCandidateLoopOverlap } from './calculate-candidate-loop-overlap';
import { calculateCandidateLabelOverlap } from './calculate-candidate-label-overlap';

/**
 * Calculate the score for each of the given candidates and add it to the candidate object, in-place.
 * A candidate's score lies between 0 and 1, and is calculated using different criteria as defined in
 * the border labels config file
 *
 * @param candidates The candidates to score
 * @param loop The border edge loop the labels will be placed on
 * @param grid The pre-existing label grid to use for checking label/object overlaps
 * @param borderLabelConfig The border label config object
 */
export function scoreLabelCandidates(
  candidates: Array<BorderLabelCandidate>,
  loop: BorderEdgeLoop,
  grid: RectangleGrid,
  borderLabelConfig: BorderLabelConfig,
) {
  // normalize the configured weights so that they sum to 1
  const weightsSum = Object.values(borderLabelConfig.scoreWeights)
    .reduce((sum, currentValue) => sum + currentValue, 0);
  const normalizedWeights = { ...borderLabelConfig.scoreWeights };
  Object.keys(normalizedWeights).forEach(
    (key: keyof typeof normalizedWeights) => normalizedWeights[key] = normalizedWeights[key] / weightsSum,
  );

  // find the maximum area that candidates can overlap
  const maximumLabelOverlapArea = candidates.slice(0, 3)
    .map((candidate) => candidate.labelArea)
    .reduce((max, currentValue) => Math.max(max, currentValue), 0);

  const maximumLoopOverlap = candidates.slice(0, 3)
    .map((candidate) => candidate.borderSectionStraightness)
    .reduce((max, currentValue) => Math.max(max, currentValue), 0);

  const maximumStraightness = candidates
    .map((candidate) => candidate.borderSectionStraightness)
    .reduce((max, currentValue) => Math.max(max, currentValue), 0);

  candidates.forEach((candidate) => {
    // determine whether the candidate overlaps any loop edges, and by how much approximately
    calculateCandidateLoopOverlap(candidate, loop);
    // find overlaps with any existing objects or labels, and add up the overlapping areas
    calculateCandidateLabelOverlap(candidate, grid);

    // at this point, our candidate contains all necessary information to score it
    // rate the overlap area
    let overlapRating = 1 - Math.min(
      1,
      8 * (candidate.labelOverlapArea || 0) / maximumLabelOverlapArea, // TODO magic number
    );
    overlapRating *= normalizedWeights.labelOverlap;
    if ((candidate.labelOverlapArea || 0) > borderLabelConfig.rules.maxLabelOverlapArea) {
      candidate.disqualified = true;
    }

    // rate the label's angle
    let simplifiedAngle = candidate.labelAngle % 180;
    if (simplifiedAngle > 90) {
      simplifiedAngle = 180 - simplifiedAngle;
    }
    let angleRating = simplifiedAngle <= 45
      ? -simplifiedAngle/45 + 1
      : (simplifiedAngle - 45) * 0.8 / 45;
    angleRating *= normalizedWeights.angle;

    // rate the straightness
    let straightnessRating = 1 - candidate.borderSectionStraightness / maximumStraightness;
    straightnessRating *= normalizedWeights.straightness;

    // rate the polyline intersection distance
    let borderIntersectionRating = Math.max(0, 1 - 5 * (candidate.loopOverlapDistance || 0) / maximumLoopOverlap);
    borderIntersectionRating *= normalizedWeights.borderIntersection;
    if ((candidate.loopOverlapDistance || 0) > borderLabelConfig.rules.maxBorderIntersectionDistance) {
      candidate.disqualified = true;
    }

    // rate the centeredness
    let centerednessRating = candidate.centeredness;
    centerednessRating *= normalizedWeights.centeredness;

    // rate the multilined-ness (?)
    let multilineRating = candidate.labelVariant === BorderLabelVariant.MultiLine
      ? 1
      : candidate.labelVariant === BorderLabelVariant.SingleLine
        ? .8
        : 0;
    multilineRating *= normalizedWeights.multiline;

    candidate.score = overlapRating + angleRating + straightnessRating +
      borderIntersectionRating + centerednessRating + multilineRating;
  });
}
