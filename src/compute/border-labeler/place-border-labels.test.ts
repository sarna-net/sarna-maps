import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { placeBorderLabels } from './place-border-labels';
import * as labelFunctions from './functions';
import { logger, RectangleGrid } from '../../common';
import { BorderLabelConfig, GlyphConfig, Rectangle2d } from '../../common';
import { BorderEdgeLoop } from '../voronoi-border';
import { FactionAffiliationPair } from '../../read/common/retain-faction-affiliation-pairing';

function stubViewBox(): Rectangle2d {
  return {
    anchor: { x: -1000, y: -1000 },
    dimensions: { width: 2000, height: 2000 },
  };
}

function stubGlyphConfig(): GlyphConfig {
  return {
    regular: { lineHeight: 10, widths: {} },
    small: { lineHeight: 10, widths: {} },
    borderLabels: { lineHeight: 10, widths: {} },
  };
}

function stubBorderLabelConfig(): BorderLabelConfig {
  return {
    rules: {
      distanceBetweenCandidates: 10,
      labelDistanceToBorder: 5,
      maxLabelOverlapArea: 100,
      borderIntersectionTolerance: 5,
      maxBorderIntersectionDistance: 20,
      minDistanceBetweenLabels: 10,
      cornerDistanceFactor: 1,
      minLoopDistanceBetweenLabels: 20,
      minViableScore: 0.1,
      minGoodScore: 0.3,
    },
    scoreWeights: {
      labelOverlap: 1,
      angle: 1,
      borderIntersection: 1,
      centeredness: 1,
      cornerScore: 1,
      multiline: 1,
      straightness: 1,
    },
    manualConfigs: {},
  };
}

function emptyLoop(): BorderEdgeLoop {
  return { edges: [], minEdgeIdx: 0 };
}

function runWith(keys: Array<string>): ReturnType<typeof vi.spyOn> {
  const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
  const borderEdgeLoops: Record<string, Array<BorderEdgeLoop>> = {};
  for (const key of keys) {
    borderEdgeLoops[key] = [emptyLoop()];
  }
  placeBorderLabels(
    stubViewBox(),
    0,
    {},
    new Map<string, FactionAffiliationPair>(),
    borderEdgeLoops,
    new RectangleGrid(stubViewBox(), 20),
    stubGlyphConfig(),
    stubBorderLabelConfig(),
  );
  return warnSpy;
}

describe('placeBorderLabels disputed-key handling', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('does not warn for a parenthesized disputed key D(F1|F2)', () => {
    const spy = runWith(['D(LC|DC)']);
    const disputedWarnings = spy.mock.calls.filter((call) =>
      String(call[1]).includes('D(LC|DC)'),
    );
    expect(disputedWarnings).to.have.length(0);
  });

  it('does not warn for hyphenated disputed keys (D-F1-F2) or bare D', () => {
    const spy = runWith(['D-LC-DC', 'D']);
    expect(spy.mock.calls.filter((c) => String(c[1]).includes('D-LC-DC')).length).to.equal(0);
    expect(spy.mock.calls.filter((c) => /key D /i.test(String(c[1]))).length).to.equal(0);
  });

  it('still warns for a genuinely unknown non-disputed faction key', () => {
    const spy = runWith(['ZZZ']);
    const unknownWarnings = spy.mock.calls.filter((call) =>
      String(call[1]).includes('ZZZ'),
    );
    expect(unknownWarnings.length).to.be.greaterThan(0);
  });
});

describe('placeBorderLabels shared-border deduplication', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('labels a shared AuC/TC border exactly once (no TC label on the AuC border)', () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

    // A square border loop, well inside the view box, present under BOTH the
    // AuC and TC faction keys (as generateBorderLoops stores shared borders).
    // ownerFaction marks which territory is inside the loop.
    function sharedLoop(): BorderEdgeLoop {
      const mk = (id: string, x: number, y: number) => ({
        id, x, y, vertex1Idx: 0, vertex2Idx: 0, vertex3Idx: 0, neighborNodeIndices: [], borderAffiliations: {},
      });
      const a = mk('a', 0, 0);
      const b = mk('b', 100, 0);
      const c = mk('c', 100, 100);
      const d = mk('d', 0, 100);
      const edge = (id: string, n1: any, n2: any) => ({
        id, node1: n1, node2: n2, vertex1Idx: 0, vertex2Idx: 0,
        affiliation1: 'AuC', affiliation2: 'TC', length: 100, closeness: 0,
        leftAffiliation: 'AuC', rightAffiliation: 'TC',
      });
      return {
        edges: [edge('e1', a, b), edge('e2', b, c), edge('e3', c, d), edge('e4', d, a)],
        minEdgeIdx: 0,
        ownerFaction: 'AuC',
        innerAffiliation: 'AuC',
      };
    }

    const loops: Record<string, Array<BorderEdgeLoop>> = {
      AuC: [sharedLoop()],
      TC: [sharedLoop()],
    };

    const genSpy = vi.spyOn(labelFunctions, 'generateLabelCandidates').mockImplementation(() => []);

    placeBorderLabels(
      stubViewBox(),
      0,
      {},
      new Map<string, FactionAffiliationPair>(),
      loops,
      new RectangleGrid(stubViewBox(), 20),
      stubGlyphConfig(),
      stubBorderLabelConfig(),
    );

    // The same geometry must not be labeled twice just because it is stored
    // under two adjacent faction keys.
    expect(genSpy.mock.calls.length).to.equal(1);
    genSpy.mockRestore();
  });
});
