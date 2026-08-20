import { describe, it, expect } from 'vitest';
import { pruneShortEdges } from './prune-short-edges';
import { relaxBorderSection } from './relax-border-section';
import { subdivideDangerousEdges } from './subdivide-dangerous-edges';
import { VoronoiBorderEdge, VoronoiBorderNode, BorderSection } from '../../types';
import { BorderDelaunayVertex } from '../../types';
import { BorderNodeStore } from '../../../../common';
import { coordKey } from '../utils/node-coord-key';

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

const vertices = [] as Array<BorderDelaunayVertex>;

describe('pruneShortEdges / subdivideDangerousEdges node identity', () => {
  it('assigns a unique id to the synthesized midpoint node (no id collision)', () => {
    const a = node('a', 0, 0);
    const b = node('b', 1, 0);
    const c = node('c', 2, 0);
    const store = new BorderNodeStore();
    store.register(a);
    store.register(b);
    store.register(c);
    const section: BorderSection = {
      id: 's',
      edges: [edge('e1', a, b), edge('e2', b, c)],
      isLoop: false,
      affiliation1: 'LC',
      affiliation2: 'DC',
      node1: a,
      node2: c,
      length: -1,
      minEdgeIdx: -1,
    };

    pruneShortEdges(section, vertices, {}, store, 4);

    // Core invariant: no two distinct coordinates may share an id. The old bug
    // had the synthesized midpoint inherit node1.id, collapsing two different
    // points onto one id.
    const coordToId = new Map<string, string>();
    for (const e of section.edges) {
      for (const n of [e.node1, e.node2]) {
        const key = `${n.x.toFixed(6)},${n.y.toFixed(6)}`;
        const prev = coordToId.get(key);
        expect(prev === undefined || prev === n.id).to.equal(true);
        coordToId.set(key, n.id);
      }
    }
    // Every distinct coordinate must map to a distinct id.
    const allIds = new Set<string>();
    coordToId.forEach((id) => allIds.add(id));
    expect(allIds.size).to.equal(coordToId.size);
  });

  it('assigns a unique id to the synthesized subdivision node', () => {
    const a = node('a', 0, 0);
    const b = node('b', 100, 0);
    const store = new BorderNodeStore();
    store.register(a);
    store.register(b);
    const section: BorderSection = {
      id: 's',
      edges: [edge('e1', a, b)],
      isLoop: false,
      affiliation1: 'LC',
      affiliation2: 'DC',
      node1: a,
      node2: b,
      length: -1,
      minEdgeIdx: -1,
    };
    // force subdivision
    section.edges[0].closeness = 1000;

    subdivideDangerousEdges(section, vertices, {}, store);

    const ids = section.edges.flatMap((e) => [e.node1.id, e.node2.id]);
    const unique = new Set(ids);
    expect(unique.size).to.equal(ids.length);
  });

  it('keeps mutated coordinates inside a single 6-decimal coordKey bucket (no rollover drift)', () => {
    // Regression for root cause #1: pruneShortEdges and relaxBorderSection must
    // round every mutated coordinate to 6 decimals (round6) so that the two
    // copies of a node synthesized at a midpoint can never land on opposite
    // sides of the 6-decimal rollover boundary.
    const a = node('a', 0, 0);
    const b = node('b', 1, 0);
    const c = node('c', 2, 0);
    const d = node('d', 3, 0);
    const eN = node('e', 4, 0);
    const store = new BorderNodeStore();
    store.register(a);
    store.register(b);
    store.register(c);
    store.register(d);
    store.register(eN);
    const section: BorderSection = {
      id: 's',
      edges: [
        edge('e1', a, b),
        edge('e2', b, c),
        edge('e3', c, d),
        edge('e4', d, eN),
      ],
      isLoop: false,
      affiliation1: 'LC',
      affiliation2: 'DC',
      node1: a,
      node2: eN,
      length: -1,
      minEdgeIdx: -1,
    };

    pruneShortEdges(section, vertices, {}, store, 5);
    relaxBorderSection(section, vertices, store, 0.5, 0);

    // Post-condition: every coordKey bucket contains node objects whose
    // 6-decimal coords are identical (i.e. no bucket has split coordinates).
    store.canonicalizeEdges(section.edges);
    const bucketNodes = new Map<string, Array<VoronoiBorderNode>>();
    for (const e of section.edges) {
      for (const n of [e.node1, e.node2]) {
        const key = coordKey(n.x, n.y);
        if (!bucketNodes.has(key)) bucketNodes.set(key, []);
        bucketNodes.get(key)!.push(n);
      }
    }
    for (const nodes of bucketNodes.values()) {
      const first = coordKey(nodes[0].x, nodes[0].y);
      for (const n of nodes) {
        expect(coordKey(n.x, n.y)).to.equal(first);
      }
    }
  });
});

describe('BorderNodeStore coordinate-index integrity (phantom node prevention)', () => {
  it('re-indexes a node when move() relocates it', () => {
    const store = new BorderNodeStore();
    const n = node('a', 1, 1);
    store.register(n);
    expect(store.get(1, 1)).to.equal(n);

    store.move(n, 5, 7);

    // The stale key must be released and the new key must resolve to the node.
    expect(store.get(1, 1)).to.equal(undefined);
    expect(store.get(5, 7)).to.equal(n);
    expect(n.x).to.equal(5);
    expect(n.y).to.equal(7);
  });

  it('does NOT mint a phantom duplicate at a relocated coordinate', () => {
    const store = new BorderNodeStore();
    const n = node('a', 0, 0);
    store.register(n);

    store.move(n, 3, 4);
    // This is the exact call that used to create a second object for the same
    // physical point once relax had moved the node behind the store's back.
    const fetched = store.getOrCreate(3, 4);

    expect(fetched).to.equal(n);
    expect(store.size()).to.equal(1);
  });

  it('keeps the store consistent after relaxBorderSection moves nodes', () => {
    const store = new BorderNodeStore();
    const a = node('a', 0, 0);
    const b = node('b', 5, 3); // spike: pulled towards the a-c line
    const c = node('c', 10, 0);
    const d = node('d', 15, 0);
    [a, b, c, d].forEach((n) => store.register(n));

    const section: BorderSection = {
      id: 's',
      edges: [edge('e1', a, b), edge('e2', b, c), edge('e3', c, d)],
      isLoop: false,
      affiliation1: 'LC',
      affiliation2: 'DC',
      node1: a,
      node2: d,
      length: -1,
      minEdgeIdx: -1,
    };
    section.edges.forEach((e) => {
      e.closeness = 10;
    });

    relaxBorderSection(section, vertices, store, 0.5, 0);
    store.canonicalizeEdges(section.edges);

    // Every endpoint must be THE canonical node for its own coordinate.
    expect(store.verifyIntegrity(section.edges)).to.deep.equal([]);
  });

  it('reports phantom nodes when a node is mutated behind the store (regression guard)', () => {
    const store = new BorderNodeStore();
    const a = node('a', 0, 0);
    const b = node('b', 1, 0);
    store.register(a);
    store.register(b);
    const e = edge('e1', a, b);

    // Simulate the old buggy path: direct coordinate write, no re-index.
    a.x = 42;
    a.y = 42;

    const problems = store.verifyIntegrity([e]);
    expect(problems.length).to.be.greaterThan(0);
    expect(problems[0]).to.contain('not registered');
  });

  it('subdivideDangerousEdges reuses the canonical node at a rounded midpoint', () => {
    const store = new BorderNodeStore();
    const a = node('a', 0, 0);
    const b = node('b', 4, 0);
    store.register(a);
    store.register(b);
    // Pre-register the exact midpoint; subdivision must reuse it, not clone it.
    const mid = store.getOrCreate(2, 0);

    const section: BorderSection = {
      id: 's',
      edges: [edge('e1', a, b)],
      isLoop: false,
      affiliation1: 'LC',
      affiliation2: 'DC',
      node1: a,
      node2: b,
      length: -1,
      minEdgeIdx: -1,
    };
    section.edges[0].closeness = 0.01; // force subdivision

    subdivideDangerousEdges(section, vertices, {}, store);

    expect(section.edges.length).to.equal(2);
    expect(section.edges[0].node2).to.equal(mid);
    expect(section.edges[1].node1).to.equal(mid);
    expect(store.verifyIntegrity(section.edges)).to.deep.equal([]);
  });
});
