import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateBorderLoops } from './generate-border-loops';
import { BorderSection } from '../types';
import { VoronoiBorderEdge } from '../types';
import { VoronoiBorderNode } from '../types';
import { EMPTY_FACTION, INDEPENDENT } from '../../constants';
import { logger } from '../../../common';

const FACTION = 'AuC';

function node(id: string, x: number, y: number): VoronoiBorderNode {
  return { id, x, y, vertex1Idx: 0, vertex2Idx: 0, vertex3Idx: 0, neighborNodeIndices: [], borderAffiliations: {} };
}

function edge(id: string, n1: VoronoiBorderNode, n2: VoronoiBorderNode, a1: string, a2: string): VoronoiBorderEdge {
  return {
    id,
    node1: n1,
    node2: n2,
    vertex1Idx: 0,
    vertex2Idx: 0,
    affiliation1: a1,
    affiliation2: a2,
    leftAffiliation: a1,
    rightAffiliation: a2,
    length: 1,
    closeness: 0,
  };
}

function section(id: string, edges: VoronoiBorderEdge[], a1: string, a2: string): BorderSection {
  return {
    id,
    edges,
    isLoop: false,
    affiliation1: a1,
    affiliation2: a2,
    node1: edges[0].node1,
    node2: edges[edges.length - 1].node2,
    length: -1,
    minEdgeIdx: -1,
  };
}

describe('generateBorderLoops sentinel handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not build loops for EMPTY_FACTION / INDEPENDENT keys and does not warn for them', () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

    // A coastline: faction territory bordering empty/independent space.
    const a = node('a', 0, 0);
    const b = node('b', 1, 0);
    const c = node('c', 2, 0);
    const d = node('d', 3, 0);

    const factionCoast = section('coast', [edge('e1', a, b, FACTION, EMPTY_FACTION)], FACTION, EMPTY_FACTION);
    const indepEdge = section('indep', [edge('e2', c, d, FACTION, INDEPENDENT)], FACTION, INDEPENDENT);

    const result = generateBorderLoops([factionCoast, indepEdge], [{ x: 0, y: 0, affiliation: FACTION }] as any);

    // Real faction still gets its loops.
    expect(result[FACTION]).to.exist;
    // Sentinel keys are left empty (declared but never populated).
    expect(result[EMPTY_FACTION]).to.have.length(0);
    expect(result[INDEPENDENT]).to.have.length(0);

    // No "stranded open border" warning should be emitted for EMPTY/INDEPENDENT.
    const sentinelWarnings = warnSpy.mock.calls.filter((call) =>
      String(call[1]).includes('stranded open border') &&
      (String(call[2]).includes(EMPTY_FACTION) || String(call[2]).includes(INDEPENDENT)),
    );
    expect(sentinelWarnings).to.have.length(0);
  });

  it('reproduction: splitSections uses coordKey for isLoop, not node ID', () => {
    // Regression for "Disputed/stranded open border could not be closed into a loop".
    // Two sections with different node IDs but same coordinates should be detected
    // as a closed loop by splitSections (using coordKey), not as an open chain.
    const FACTION = 'DC';
    const OTHER = 'EF';

    const a = node('a', 0, 0);
    const b = node('b', 10, 0);
    const bTwin = node('b-twin', 10, 0); // same coordinate, different ID
    const c = node('c', 10, 10);
    const d = node('d', 0, 10);

    // Section 1: a -> b (node ID 'b')
    // Section 2: bTwin -> c -> d -> a (node ID 'b-twin' at same coord as b)
    // These should merge into a closed loop because b and bTwin are at the same coordinate.
    const s1 = section('s1', [edge('e1', a, b, FACTION, OTHER)], FACTION, OTHER);
    const s2 = section('s2', [
      edge('e2', bTwin, c, FACTION, OTHER),
      edge('e3', c, d, FACTION, OTHER),
      edge('e4', d, a, FACTION, OTHER),
    ], FACTION, OTHER);

    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const result = generateBorderLoops([s1, s2], [{ x: 0, y: 0, affiliation: FACTION }] as any);

    // Should produce one closed loop, not a stranded open border
    expect(result[FACTION]).to.exist;
    expect(result[FACTION].length).to.equal(1);
    expect(result[FACTION][0].isLoop).to.equal(true);

    // No stranded-open-border warning
    const strandedWarnings = warnSpy.mock.calls.filter((call) =>
      String(call[1]).includes('stranded open border'),
    );
    expect(strandedWarnings).to.have.length(0);
  });

  it('reproduction: DC/FS random curves - sections with coordinate drift merge correctly', () => {
    // Regression for "portion of border between DC & FS is random curves and small loops".
    // When pruneShortEdges creates midpoints that differ at 7th decimal, the sections
    // should still merge because coordKey rounds to 6 decimals.
    const FACTION = 'DC';
    const OTHER = 'FS';

    const a = node('a', 0, 0);
    const b = node('b', 10, 0);
    // bTwin is at the same 6-decimal coordinate as b but different ID
    const bTwin = node('b-twin', 10, 0);
    const c = node('c', 20, 0);

    const s1 = section('s1', [edge('e1', a, b, FACTION, OTHER)], FACTION, OTHER);
    const s2 = section('s2', [edge('e2', bTwin, c, FACTION, OTHER)], FACTION, OTHER);

    const result = generateBorderLoops([s1, s2], [{ x: 0, y: 0, affiliation: FACTION }] as any);

    // Should merge into a single open chain (not two separate stranded loops)
    expect(result[FACTION].length).to.equal(1);
    expect(result[FACTION][0].edges.length).to.equal(2);
  });
});
