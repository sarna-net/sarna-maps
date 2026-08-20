import { describe, it, expect } from 'vitest';
import { selectBestCandidates } from './select-best-candidates';
import { BorderLabelCandidate } from '../types';
import { BorderLabelConfig, RectangleGrid } from '../../../common';

function grid(): RectangleGrid {
  return new RectangleGrid({ anchor: { x: 0, y: 0 }, dimensions: { width: 1000, height: 1000 } }, 20);
}

function config(): BorderLabelConfig {
  return {
    rules: {
      distanceBetweenCandidates: 3,
      labelDistanceToBorder: 1.25,
      maxLabelOverlapArea: 24,
      borderIntersectionTolerance: 0.25,
      maxBorderIntersectionDistance: 2.5,
      minDistanceBetweenLabels: 40,
      minLoopDistanceBetweenLabels: 55,
      cornerDistanceFactor: 0.05,
      minViableScore: 0.65,
      minGoodScore: 0.75,
    },
    scoreWeights: {
      labelOverlap: 115,
      angle: 10,
      borderIntersection: 50,
      centeredness: 0,
      cornerScore: 50,
      multiline: 30,
      straightness: 45,
    },
    manualConfigs: {},
  } as unknown as BorderLabelConfig;
}

function candidate(overrides: Partial<BorderLabelCandidate>): BorderLabelCandidate {
  return {
    id: 'c',
    score: 0.8,
    disqualified: false,
    anchorPoint: { x: 10, y: 10 },
    positionOnEdgeLoop: 0,
    centeredness: 1,
    borderSectionStraightness: 0,
    cornerScore: 1,
    labelVariant: 'SingleLine' as any,
    labelAngle: 0,
    labelArea: 10,
    rect: {
      bl: { x: 8, y: 9 },
      br: { x: 12, y: 9 },
      tl: { x: 8, y: 11 },
      tr: { x: 12, y: 11 },
    },
    tokens: [{ str: 'TEST', width: 4 }],
    labelBaselines: {
      bottom: { p1: { x: 8, y: 9 }, p2: { x: 12, y: 9 } },
      top: { p1: { x: 8, y: 11 }, p2: { x: 12, y: 11 } },
    },
    ...overrides,
  };
}

describe('selectBestCandidates border-crossing fallback', () => {
  it('NEVER selects a border-crossing candidate as the fallback', () => {
    // Every candidate is disqualified purely for border intersection.
    const candidates = [
      candidate({ id: 'c1', score: 0.9, disqualified: true, disqualificationReason: 'border intersection (1.2)' }),
      candidate({ id: 'c2', score: 0.7, disqualified: true, disqualificationReason: 'border intersection (0.8)' }),
    ];
    const selected = selectBestCandidates(candidates, config(), grid());
    // No viable candidate exists and the hard constraint must not be overridden.
    expect(selected).to.have.lengthOf(0);
  });

  it('falls back to the best SOFT-disqualified candidate when present', () => {
    const candidates = [
      candidate({ id: 'crossing', score: 0.95, disqualified: true, disqualificationReason: 'border intersection (2.0)' }),
      candidate({ id: 'soft', score: 0.6, disqualified: true, disqualificationReason: 'label overlap (30)' }),
    ];
    const selected = selectBestCandidates(candidates, config(), grid());
    // The soft-disqualified candidate is the only legal fallback.
    expect(selected).to.have.lengthOf(1);
    expect(selected[0].id).to.equal('soft');
  });
});
