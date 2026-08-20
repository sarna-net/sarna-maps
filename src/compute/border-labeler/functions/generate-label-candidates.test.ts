import { describe, it, expect, beforeEach } from 'vitest';
import {
  BorderLabelConfig,
  BorderLabelVariant,
  Faction,
  GlyphConfig,
  Point2d,
} from '../../../common';
import { BorderEdgeLoop } from '../../voronoi-border';
import { generateLabelCandidates } from './generate-label-candidates';

function stubGlyphConfig(): GlyphConfig {
  const widths: Record<string, number> = {};
  for (let i = 32; i < 127; i++) {
    widths[String.fromCharCode(i)] = 6;
  }
  widths[' '] = 3;
  return {
    regular: { lineHeight: 10, widths },
    small: { lineHeight: 10, widths },
    borderLabels: { lineHeight: 10, widths },
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

interface TestNode extends Point2d {
  id: string;
  vertex1Idx: number;
  vertex2Idx: number;
  vertex3Idx: number;
  neighborNodeIndices: number[];
  borderAffiliations: Record<string, unknown>;
}

function mkNode(id: string, x: number, y: number): TestNode {
  return {
    id, x, y, vertex1Idx: 0, vertex2Idx: 0, vertex3Idx: 0,
    neighborNodeIndices: [], borderAffiliations: {},
  };
}

/**
 * A clockwise (Y-up) square centered at origin.
 * Vertices (CW): (50,-50)->(-50,-50)->(-50,50)->(50,50)->back
 * Interior = center = (0,0).
 * Shoelace sum is negative => clockwise (Y-up).
 *
 * Edges (tangent = direction of travel):
 *  e1: (50,-50)->(-50,-50)  bottom edge, tangent=(-1,0), right perp=(0,1)=up   → interior ✓
 *  e2: (-50,-50)->(-50,50)  left edge,   tangent=(0,1), right perp=(1,0)=right → interior ✓
 *  e3: (-50,50)->(50,50)    top edge,    tangent=(1,0), right perp=(0,-1)=down → interior ✓
 *  e4: (50,50)->(50,-50)    right edge,  tangent=(0,-1), right perp=(-1,0)=left → interior ✓
 */
function cwSquareLoop(overrides: Partial<BorderEdgeLoop> = {}): BorderEdgeLoop {
  const a = mkNode('a', 50, -50);
  const b = mkNode('b', -50, -50);
  const c = mkNode('c', -50, 50);
  const d = mkNode('d', 50, 50);
  const edge = (id: string, n1: TestNode, n2: TestNode) => ({
    id, node1: n1, node2: n2, vertex1Idx: 0, vertex2Idx: 0,
    affiliation1: 'LC', affiliation2: 'TC', length: 100, closeness: 0,
    leftAffiliation: 'TC', rightAffiliation: 'LC',
    n1c1: undefined, n1c2: undefined, n2c1: undefined, n2c2: undefined,
  });
  return {
    edges: [edge('e1', a, b), edge('e2', b, c), edge('e3', c, d), edge('e4', d, a)],
    minEdgeIdx: 0,
    isLoop: true,
    innerAffiliation: 'LC',
    outerAffiliation: 'TC',
    isInnerLoop: false,
    ownerFaction: 'LC',
    ...overrides,
  } as unknown as BorderEdgeLoop;
}

function stubFaction(name = 'Draconis Combine'): Faction {
  return {
    id: 'DC',
    name,
    color: '#000000',
  } as Faction;
}

function determineTokens(faction: Faction) {
  const glyphSettings = stubGlyphConfig().borderLabels!;
  const spaceWidth = glyphSettings.widths[' '] || 0;
  const tokens = faction.name.split(/\s+/).map((part) => {
    let w = 0;
    for (const ch of part) w += glyphSettings.widths[ch] || 0;
    return { str: part, width: w };
  });
  const slWidth = (tokens.length - 1) * spaceWidth + tokens.reduce((s, t) => s + t.width, 0);
  const mid = Math.floor(tokens.length / 2);
  const topTokens = tokens.slice(0, mid);
  const bottomTokens = tokens.slice(mid);
  const topWidth = topTokens.reduce((s, t) => s + t.width, 0) + Math.max(0, topTokens.length - 1) * spaceWidth;
  const bottomWidth = bottomTokens.reduce((s, t) => s + t.width, 0) + Math.max(0, bottomTokens.length - 1) * spaceWidth;
  return {
    [BorderLabelVariant.Abbreviation]: { width: faction.id.length * 6, height: 10, tokens: [{ str: faction.id, width: faction.id.length * 6 }] },
    [BorderLabelVariant.SingleLine]: { width: slWidth, height: 10, tokens: [{ str: faction.name, width: slWidth }] },
    [BorderLabelVariant.MultiLine]: {
      width: Math.max(topWidth, bottomWidth),
      height: 20,
      tokens: [
        { str: topTokens.map(t => t.str).join(' '), width: topWidth },
        { str: bottomTokens.map(t => t.str).join(' '), width: bottomWidth },
      ],
    },
  };
}

describe('generateLabelCandidates', () => {
  it('displaces the anchor point toward the interior of a clockwise non-inner loop', () => {
    const loop = cwSquareLoop();
    const faction = stubFaction();
    const tokens = determineTokens(faction);
    const config = stubBorderLabelConfig();
    const candidates = generateLabelCandidates(faction, loop, 0, tokens, config);
    expect(candidates.length).to.be.greaterThan(0);

    const candidate = candidates[0];
    // perpEdge = [controlPointCenter.point, anchorPoint]
    const center = candidate.perpEdge![0];
    const anchor = candidate.perpEdge![1];
    // The square is centered at origin with interior at (0,0).
    // The anchor must move toward the interior: closer to origin than the center.
    const centerDist = Math.hypot(center.x, center.y);
    const anchorDist = Math.hypot(anchor.x, anchor.y);
    expect(anchorDist).to.be.lessThan(centerDist);
  });

  it('always places the top baseline above the bottom baseline (higher Y)', () => {
    const loop = cwSquareLoop();
    const faction = stubFaction();
    const tokens = determineTokens(faction);
    const config = stubBorderLabelConfig();
    const candidates = generateLabelCandidates(faction, loop, 0, tokens, config);
    for (const candidate of candidates) {
      expect(candidate.labelBaselines.top.p1.y).to.be.greaterThanOrEqual(
        candidate.labelBaselines.bottom.p1.y,
      );
    }
  });

  it('places the middle baseline above the bottom baseline for multiline labels', () => {
    const loop = cwSquareLoop();
    const faction = stubFaction();
    const tokens = determineTokens(faction);
    const config = stubBorderLabelConfig();
    const candidates = generateLabelCandidates(faction, loop, 0, tokens, config);
    const multiline = candidates.find(c => c.labelVariant === BorderLabelVariant.MultiLine);
    expect(multiline).toBeDefined();
    expect(multiline!.labelBaselines.middle!.p1.y).to.be.greaterThanOrEqual(
      multiline!.labelBaselines.bottom!.p1.y,
    );
  });

  it('DIAGNOSTIC: multiline token reading order across all edges of a square (interior rotates through horizontal)', () => {
    const loop = cwSquareLoop();
    const faction = stubFaction();
    const tokens = determineTokens(faction);
    const config = stubBorderLabelConfig();
    const candidates = generateLabelCandidates(faction, loop, 0, tokens, config);
    const multiline = candidates.filter(c => c.labelVariant === BorderLabelVariant.MultiLine);
    const lines: string[] = [];
    for (const c of multiline) {
      const mid = c.labelBaselines.middle!;
      const bot = c.labelBaselines.bottom!;
      const midP = { x: 0.5*(mid.p1.x+mid.p2.x), y: 0.5*(mid.p1.y+mid.p2.y) };
      const botP = { x: 0.5*(bot.p1.x+bot.p2.x), y: 0.5*(bot.p1.y+bot.p2.y) };
      const dx = botP.x - midP.x;
      const dy = botP.y - midP.y;
      const stacked = Math.abs(dy) > 1e-3;
      let visual: string;
      if (stacked) {
        visual = midP.y >= botP.y ? 'Draconis above Combine (OK)' : 'COMBINE ABOVE DRACONIS (FLIP)';
      } else {
        visual = midP.x <= botP.x ? 'Draconis(left) Combine(right) => "Draconis Combine" (OK)' : 'Combine(left) Draconis(right) => "Combine Draconis" (FLIP)';
      }
      lines.push(`pos=${c.positionOnEdgeLoop.toFixed(0).padStart(3)} mid=${midP.x.toFixed(1)},${midP.y.toFixed(1)} bot=${botP.x.toFixed(1)},${botP.y.toFixed(1)} dx=${dx.toFixed(2)} dy=${dy.toFixed(2)} stacked=${stacked} => ${visual}`);
    }
    // eslint-disable-next-line no-console
    console.log('\n' + lines.join('\n'));
  });
});
