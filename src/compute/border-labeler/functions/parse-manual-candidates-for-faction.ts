import { BorderLabelBaselines, BorderLabelCandidate, BorderLabelDetails } from '../types';
import {
  BorderLabelManualConfig,
  BorderLabelVariant, Edge2d, Faction,
  pointOnUnitCircleByPercentValue,
  scaleVector
} from '../../../common';

export function parseManualCandidatesForFaction(
  faction: Faction,
  configs: Array<BorderLabelManualConfig>,
  factionNameTokens: Record<BorderLabelVariant, BorderLabelDetails | undefined>,
): Array<BorderLabelCandidate> {
  return configs.map((config, configIndex) => {
    const labelDetails = factionNameTokens[config.labelVariant || BorderLabelVariant.SingleLine];
    const pointByDegree = pointOnUnitCircleByPercentValue((config.angle || 0) / 360);
    const baselineHalfVector = {
      a: pointByDegree.x,
      b: pointByDegree.y,
    };
    scaleVector(
      baselineHalfVector,
      0.5 * (labelDetails?.width || 1)
    );
    const baseline: Edge2d = {
      p1: { x: config.anchor.x - baselineHalfVector.a, y: config.anchor.y - baselineHalfVector.b },
      p2: { x: config.anchor.x + baselineHalfVector.a, y: config.anchor.y + baselineHalfVector.b },
    };
    const perpVector = {
      a: -baselineHalfVector.b,
      b: baselineHalfVector.a,
    };
    scaleVector(perpVector, labelDetails?.height || 1);
    const labelBaselines: BorderLabelBaselines = {
      bottom: baseline,
      top: {
        p1: { x: baseline.p1.x + perpVector.a, y: baseline.p1.y + perpVector.b },
        p2: { x: baseline.p2.x + perpVector.a, y: baseline.p2.y + perpVector.b },
      },
    };
    if (config.labelVariant === BorderLabelVariant.MultiLine) {
      scaleVector(perpVector, factionNameTokens[BorderLabelVariant.SingleLine]?.height || 1)
      labelBaselines.middle = {
        p1: { x: baseline.p1.x + perpVector.a, y: baseline.p1.y + perpVector.b },
        p2: { x: baseline.p2.x + perpVector.a, y: baseline.p2.y + perpVector.b },
      };
    }

    return {
      id: faction.id + '-M-' + configIndex,
      labelVariant: config.labelVariant || BorderLabelVariant.SingleLine,
      labelAngle: config.angle || 0,
      disqualified: false,
      anchorPoint: config.anchor,
      borderSectionStraightness: 0,
      centeredness: 0,
      labelArea: 0,
      score: 0,
      positionOnEdgeLoop: 0,
      labelBaselines,
      rect: {
        bl: labelBaselines.bottom.p1,
        tl: labelBaselines.top.p1,
        tr: labelBaselines.top.p2,
        br: labelBaselines.bottom.p2,
      },
      tokens: labelDetails?.tokens || [],
    };
  });
}
