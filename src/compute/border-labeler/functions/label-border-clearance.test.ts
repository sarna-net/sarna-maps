import { describe, it, expect } from 'vitest';
import { calculateCandidateLoopOverlap } from './calculate-candidate-loop-overlap';
import { scoreLabelCandidates } from './score-label-candidates';
import { selectBestCandidates } from './select-best-candidates';
import { BorderLabelCandidate } from '../types';
import { BorderEdgeLoop } from '../../voronoi-border';
import { BorderLabelConfig, BorderLabelVariant, RectangleGrid, Rectangle2d } from '../../../common';

const viewRect: Rectangle2d = {
  anchor: { x: -500, y: -500 },
  dimensions: { width: 1000, height: 1000 },
};

/** An axis-aligned label rectangle centred on (cx, cy). */
function candidate(
  id: string,
  cx: number,
  cy: number,
  width = 10,
  height = 4,
): BorderLabelCandidate {
  const hw = width / 2;
  const hh = height / 2;
  return {
    id,
    labelVariant: BorderLabelVariant.SingleLine,
    anchorPoint: { x: cx, y: cy },
    rect: {
      bl: { x: cx - hw, y: cy - hh },
      br: { x: cx + hw, y: cy - hh },
      tr: { x: cx + hw, y: cy + hh },
      tl: { x: cx - hw, y: cy + hh },
    },
    labelAngle: 0,
    labelArea: width * height,
    // Non-zero so the scorer's `1 - straightness / maxStraightness` term does
    // not divide by zero and produce a NaN score.
    borderSectionStraightness: 1,
    centeredness: 1,
    cornerScore: 1,
    positionOnEdgeLoop: 0,
    score: 0,
  } as unknown as BorderLabelCandidate;
}

/** A straight horizontal border running along y = `y`. */
function horizontalLoop(y: number): BorderEdgeLoop {
  return {
    minEdgeIdx: 0,
    isInnerLoop: false,
    edges: [
      {
        id: 'b1',
        node1: { x: -100, y },
        node2: { x: 100, y },
        length: 200,
      },
    ],
  } as unknown as BorderEdgeLoop;
}

function config(): BorderLabelConfig {
  return {
    rules: {
      distanceBetweenCandidates: 10,
      labelDistanceToBorder: 1.25,
      maxLabelOverlapArea: 100,
      borderIntersectionTolerance: 0.25,
      maxBorderIntersectionDistance: 2.5,
      minDistanceBetweenLabels: 10,
      cornerDistanceFactor: 1,
      minLoopDistanceBetweenLabels: 20,
      minViableScore: 0.1,
      minGoodScore: 0.3,
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
  };
}

describe('border label / border collision detection', () => {
  it('detects an overlap with a NEIGHBOURING faction loop, not just its own', () => {
    // The label sits inside its own territory (own border far away) but crosses
    // the adjacent faction's border at y = 0.
    const ownLoop = horizontalLoop(80);
    const neighbourLoop = horizontalLoop(0);
    const c = candidate('c1', 0, 0);

    calculateCandidateLoopOverlap(c, [ownLoop]);
    expect(c.loopOverlapDistance).to.equal(0); // blind, as before

    calculateCandidateLoopOverlap(c, [ownLoop, neighbourLoop]);
    expect(c.loopOverlapDistance).to.be.greaterThan(0); // now seen
  });

  it('counts a label that merely grazes the painted stroke', () => {
    // Label bottom edge at y = 2.0; border centre line at y = 1.8. With a
    // hairline test the gap reads as clean, but the stroke is painted either
    // side of the centre line.
    const loop = horizontalLoop(1.8);
    const c = candidate('graze', 0, 4); // rect spans y = 2 .. 6

    calculateCandidateLoopOverlap(c, [loop], 0);
    expect(c.loopOverlapDistance).to.equal(0);

    calculateCandidateLoopOverlap(c, [loop], 0.5);
    expect(c.loopOverlapDistance).to.be.greaterThan(0);
  });

  it('reports no overlap for a label with genuine clearance', () => {
    const loop = horizontalLoop(0);
    const c = candidate('clear', 0, 50);

    calculateCandidateLoopOverlap(c, [loop], 0.5);

    expect(c.loopOverlapDistance).to.equal(0);
  });

  it('disqualifies an overlapping candidate instead of only penalising it', () => {
    const loop = horizontalLoop(0);
    const overlapping = candidate('overlapping', 0, 0);
    const clean = candidate('clean', 0, 60);

    scoreLabelCandidates(
      [overlapping, clean],
      loop,
      new RectangleGrid({ ...viewRect }, 20),
      config(),
      [loop],
      0.5,
    );

    expect(overlapping.disqualified).to.equal(true);
    expect(overlapping.disqualificationReason).to.contain('border intersection');
    expect(clean.disqualified).to.not.equal(true);
  });

  it('never wins a placement for an overlapping candidate when a clean one exists', () => {
    const loop = horizontalLoop(0);
    const overlapping = candidate('overlapping', 0, 0);
    const clean = candidate('clean', 0, 60);
    const cfg = config();

    scoreLabelCandidates(
      [overlapping, clean],
      loop,
      new RectangleGrid({ ...viewRect }, 20),
      cfg,
      [loop],
      0.5,
    );
    const selected = selectBestCandidates([overlapping, clean], cfg, new RectangleGrid({ ...viewRect }, 20));

    expect(selected.map((s) => s.id)).to.not.contain('overlapping');
  });

  it('still emits the least-overlapping label when every candidate overlaps', () => {
    // A cramped territory where no placement is clean: we must still get a
    // label rather than silently dropping the faction name. `bad` straddles the
    // line and so reaches further past it than `less-bad`, which only dips in.
    const loop = horizontalLoop(0);
    const bad = candidate('bad', 0, 0, 10, 12);
    const lessBad = candidate('less-bad', 0, 1.6);
    const cfg = config();

    scoreLabelCandidates(
      [bad, lessBad],
      loop,
      new RectangleGrid({ ...viewRect }, 20),
      cfg,
      [loop],
      0.5,
    );
    const selected = selectBestCandidates([bad, lessBad], cfg, new RectangleGrid({ ...viewRect }, 20));

    expect(selected.length).to.equal(1);
    expect(selected[0].id).to.equal('less-bad');
  });
});
