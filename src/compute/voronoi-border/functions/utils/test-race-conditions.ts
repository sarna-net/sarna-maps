import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateBorderLoops } from '../generate-border-loops';
import { BorderSection, BorderDelaunayVertex, VoronoiBorderEdge } from '../../types';
import { BorderNodeStore } from '../../../../common';
import { mergeBorderSections } from '../merge-border-sections';
import { generateBorderEdges } from '../generate-border-edges';
import { deepCopySection } from './deep-copy-section';
import { Point2d } from '../../../../common/math-2d/types/point-2d';

function node(id: string, x: number, y: number): any {
  return { id, x, y, vertex1Idx: 0, vertex2Idx: 0, vertex3Idx: 0, neighborNodeIndices: [], borderAffiliations: {} };
}

function edge(id: string, n1: any, n2: any): VoronoiBorderEdge {
  return {
    id,
    node1: n1,
    node2: n2,
    vertex1Idx: 0,
    vertex2Idx: 0,
    affiliation1: 'LC',
    affiliation2: 'DC',
    leftAffiliation: 'LC',
    rightAffiliation: 'DC',
    length: 1,
    closeness: 0,
  }
}

function createSection(id: string, edges: VoronoiBorderEdge[], affiliation1 = 'LC', affiliation2 = 'DC'): BorderSection {
  const isLoop = edges.length > 0 && edges[0].node1.id === edges[edges.length - 1].node2.id;
  return {
    id,
    edges,
    isLoop,
    affiliation1,
    affiliation2,
    node1: edges[0].node1,
    node2: edges[edges.length - 1].node2,
    length: -1,
    minEdgeIdx: -1,
    innerAffiliation: undefined,
    outerAffiliation: undefined,
  };
}

function createVertex(x: number, y: number, affiliation: string): BorderDelaunayVertex {
  return { x, y, affiliation, adjacentTriIndices: [] };
}

describe('Node identity preservation through pipeline', () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should preserve node identity across deep copy in concurrent section processing', () => {
    const a = node('n-0-0', 0, 0);
    const b = node('n-0-1', 10, 0);
    const c = node('n-0-2', 10, 10);
    const d = node('n-0-3', 0, 10);

    const edge1 = edge('e1', a, b);
    const edge2 = edge('e2', b, c);
    const edge3 = edge('e3', c, d);
    const edge4 = edge('e4', d, a);

    const section1 = createSection('s1', [edge1, edge2]);
    const section2 = createSection('s2', [edge3, edge4]);

    const vertices = [
      createVertex(0, 0, 'LC'),
      createVertex(10, 0, 'LC'),
      createVertex(10, 10, 'LC'),
      createVertex(0, 10, 'LC'),
    ];

    const sectionCopies = [section1, section2].map(deepCopySection);
    expect(sectionCopies[0].node1.id).toBe(a.id);
    expect(sectionCopies[1].node2.id).toBe(d.id);
    expect(sectionCopies[0].edges[0].node1.id).toBe(a.id);
    expect(sectionCopies[0].edges[1].node2.id).toBe(c.id);
  });

  it('should handle concurrent merging without node ID corruption', () => {
    const a = node('n-1-0', 0, 0);
    const b = node('n-1-1', 10, 0);
    const c = node('n-1-2', 10, 10);
    const d = node('n-1-3', 0, 10);

    const edge1 = edge('e1', a, b);
    const edge2 = edge('e2', b, c);
    const edge3 = edge('e3', c, d);
    const edge4 = edge('e4', d, a);

    const section1 = createSection('s1', [edge1]);
    const section2 = createSection('s2', [edge2]);
    const section3 = createSection('s3', [edge3]);
    const section4 = createSection('s4', [edge4]);

    const merged = mergeBorderSections([section1, section2, section3, section4], 0);
    expect(merged.length).toBe(1);
    expect(merged[0].edges.length).toBe(4);
    expect(merged[0].isLoop).toBe(true);
    expect(merged[0].node1.id).toBe(a.id);
    expect(merged[0].node2.id).toBe(a.id);
  });

  it('should canonicalize coincident nodes with BorderNodeStore', () => {
    const a = node('node-2-0', 0, 0);
    const b1 = node('node-2-1', 10, 0);
    const b2 = node('node-2-2', 10, 0);
    const c = node('node-2-3', 20, 0);
    const d = node('node-2-4', 10, 10);

    const store = new BorderNodeStore();
    store.register(a);
    store.register(b1);
    store.register(b2);
    store.register(c);
    store.register(d);

    const edge1 = edge('edge-1', a, b1);
    const edge2 = edge('edge-2', b2, c);

    const edges = [edge1, edge2];

    store.canonicalizeEdges(edges);
    expect(edges.flatMap(e => [e.node1.id, e.node2.id])).toContain('node-2-1');
    expect(edges.flatMap(e => [e.node1.id, e.node2.id])).toContain('node-2-3');
  });

  it('should generate loops with stable node IDs via BorderNodeStore', () => {
    const results = [];

    for (let i = 0; i < 100; i++) {
      const store = new BorderNodeStore();
      const a = store.getOrCreate(0, 0);
      const b = store.getOrCreate(10, 0);
      const c = store.getOrCreate(10, 10);
      const d = store.getOrCreate(0, 10);

      const edge1 = edge('loop-e1', a, b);
      const edge2 = edge('loop-e2', b, c);
      const edge3 = edge('loop-e3', c, d);
      const edge4 = edge('loop-e4', d, a);

      const sections = [
        createSection(`loop-s1-${i}`, [edge1]),
        createSection(`loop-s2-${i}`, [edge2]),
        createSection(`loop-s3-${i}`, [edge3]),
        createSection(`loop-s4-${i}`, [edge4]),
      ];

      const vertices = [
        createVertex(0, 0, 'LC'),
        createVertex(10, 0, 'LC'),
        createVertex(10, 10, 'LC'),
        createVertex(0, 10, 'LC'),
      ];

      const loops = generateBorderLoops(sections, vertices);
      results.push(loops.LC);
    }

    results.forEach((loops, i) => {
      expect(loops.length).toBe(1);
      expect(loops[0].edges.length).toBe(4);
      expect(loops[0].isLoop).toBe(true);
      expect(loops[0].node1.id).toBe(loops[0].node2.id);
    });
  });
});
