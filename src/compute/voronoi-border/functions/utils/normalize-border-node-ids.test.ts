import { describe, it, expect } from 'vitest';
import { BorderNodeStore } from '../../../../common';
import { VoronoiBorderEdge, VoronoiBorderNode } from '../../types';

function node(id: string, x: number, y: number): VoronoiBorderNode {
  return { id, x, y, vertex1Idx: 0, vertex2Idx: 0, vertex3Idx: 0, neighborNodeIndices: [], borderAffiliations: {} };
}

function edge(id: string, n1: VoronoiBorderNode, n2: VoronoiBorderNode): VoronoiBorderEdge {
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
  };
}

describe('canonicalizeEdges (via BorderNodeStore)', () => {
  it('collapses coincident nodes onto a single canonical object and id', () => {
    const a = node('a', 0, 0);
    const b = node('b', 1, 0);
    const bPrime = node('b-x', 1, 0); // same coordinate, different id
    const c = node('c', 2, 0);

    const store = new BorderNodeStore();
    store.register(a);
    store.register(b);
    store.register(bPrime);
    store.register(c);

    const e1 = edge('e1', a, b);
    const e2 = edge('e2', bPrime, c);

    store.canonicalizeEdges([e1, e2]);

    // both edges must reference the same node object at (1,0)
    expect(e1.node2).to.equal(e2.node1);
    expect(e1.node2.id).to.equal('b');
    expect(e2.node1.id).to.equal('b');
  });

  it('keeps non-coincident nodes distinct', () => {
    const a = node('a', 0, 0);
    const b = node('b', 1, 0);
    const c = node('c', 2, 0.000001);

    const store = new BorderNodeStore();
    store.register(a);
    store.register(b);
    store.register(c);

    const e1 = edge('e1', a, b);
    const e2 = edge('e2', b, c);

    store.canonicalizeEdges([e1, e2]);

    expect(e1.node2).to.equal(e2.node1);
    expect(e2.node2.id).to.equal('c');
  });

  it('is tolerant of tiny floating-point divergence at the same coordinate', () => {
    const a = node('a', 0, 0);
    const b = node('b', 1, 0);
    const bPrime = node('b-y', 1 + 1e-9, 0 - 1e-9);

    const store = new BorderNodeStore();
    store.register(a);
    store.register(b);
    store.register(bPrime);

    const e1 = edge('e1', a, b);
    const e2 = edge('e2', bPrime, a);

    store.canonicalizeEdges([e1, e2]);

    expect(e1.node2).to.equal(e2.node1);
  });
});
