import { describe, it, expect } from 'vitest';
import { connectInternalBorderSections } from './connect-internal-border-sections';
import { VoronoiBorderEdge, VoronoiBorderNode, BorderSection } from '../../types';
import { BorderNodeStore } from '../../../common';

function node(id: string, x: number, y: number): VoronoiBorderNode {
  return {
    id,
    x,
    y,
    vertex1Idx: 0,
    vertex2Idx: 0,
    vertex3Idx: 0,
    neighborNodeIndices: [],
    borderAffiliations: {},
  } as VoronoiBorderNode;
}

function edge(id: string, n1: VoronoiBorderNode, n2: VoronoiBorderNode): VoronoiBorderEdge {
  return {
    id,
    node1: n1,
    node2: n2,
    vertex1Idx: 0,
    vertex2Idx: 1,
    affiliation1: 'LC',
    affiliation2: 'DC',
    leftAffiliation: '',
    rightAffiliation: '',
    length: Math.hypot(n2.x - n1.x, n2.y - n1.y),
    closeness: 0,
  } as VoronoiBorderEdge;
}

describe('connectInternalBorderSections', () => {
  it('does not crash when a section has no edges', () => {
    const a = node('a', 0, 0);
    const b = node('b', 1, 0);
    const store = new BorderNodeStore();
    store.register(a);
    store.register(b);
    const section: BorderSection = {
      id: 's',
      edges: [],
      isLoop: false,
      affiliation1: 'LC,FOX',
      affiliation2: 'LC,RAVEN',
      node1: a,
      node2: b,
      length: -1,
      minEdgeIdx: -1,
    };

    expect(() => {
      connectInternalBorderSections(1, [section], []);
    }).not.toThrow();
  });

  it('does not crash when all sections have no edges', () => {
    const a = node('a', 0, 0);
    const b = node('b', 1, 0);
    const store = new BorderNodeStore();
    store.register(a);
    store.register(b);
    const sections: BorderSection[] = [
      {
        id: 's1',
        edges: [],
        isLoop: false,
        affiliation1: 'LC,FOX',
        affiliation2: 'LC,RAVEN',
        node1: a,
        node2: b,
        length: -1,
        minEdgeIdx: -1,
      },
      {
        id: 's2',
        edges: [],
        isLoop: false,
        affiliation1: 'LC,FOX',
        affiliation2: 'LC,RAVEN',
        node1: a,
        node2: b,
        length: -1,
        minEdgeIdx: -1,
      },
    ];

    expect(() => {
      connectInternalBorderSections(1, sections, []);
    }).not.toThrow();
  });

  it('skips snapping for a section with no edges but still processes sections with edges', () => {
    const a = node('a', 0, 0);
    const b = node('b', 1, 0);
    const c = node('c', 2, 0);
    const store = new BorderNodeStore();
    store.register(a);
    store.register(b);
    store.register(c);
    const sectionWithEdges: BorderSection = {
      id: 's1',
      edges: [edge('e1', a, b)],
      isLoop: false,
      affiliation1: 'LC,FOX',
      affiliation2: 'LC,RAVEN',
      node1: a,
      node2: b,
      length: -1,
      minEdgeIdx: -1,
    };
    const emptySection: BorderSection = {
      id: 's2',
      edges: [],
      isLoop: false,
      affiliation1: 'LC,FOX',
      affiliation2: 'LC,RAVEN',
      node1: c,
      node2: b,
      length: -1,
      minEdgeIdx: -1,
    };

    expect(() => {
      connectInternalBorderSections(1, [sectionWithEdges, emptySection], []);
    }).not.toThrow();
  });
});