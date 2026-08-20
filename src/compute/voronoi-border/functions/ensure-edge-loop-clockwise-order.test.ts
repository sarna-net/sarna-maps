import { describe, it, expect } from 'vitest';
import { ensureEdgeLoopClockwiseOrder } from './ensure-edge-loop-clockwise-order';
import { BorderEdgeLoop, VoronoiBorderEdge, VoronoiBorderNode } from '../types';

function node(id: string, x: number, y: number): VoronoiBorderNode {
  return { id, x, y, vertex1Idx: 0, vertex2Idx: 0, vertex3Idx: 0, neighborNodeIndices: [], borderAffiliations: {} };
}

function edge(id: string, n1: VoronoiBorderNode, n2: VoronoiBorderNode, leftAff: string, rightAff: string): VoronoiBorderEdge {
  return {
    id,
    node1: n1,
    node2: n2,
    vertex1Idx: 0,
    vertex2Idx: 1,
    affiliation1: leftAff,
    affiliation2: rightAff,
    leftAffiliation: leftAff,
    rightAffiliation: rightAff,
    length: Math.hypot(n2.x - n1.x, n2.y - n1.y),
    closeness: 0,
  } as VoronoiBorderEdge;
}

function loop(edges: VoronoiBorderEdge[]): BorderEdgeLoop {
  return {
    edges,
    minEdgeIdx: 0,
    innerAffiliation: undefined,
    outerAffiliation: undefined,
  };
}

describe('ensureEdgeLoopClockwiseOrder', () => {
  it('correctly identifies clockwise loop (Y-up coordinates)', () => {
    // Clockwise square in Y-up coordinates (negative signed area)
    // (0,0) -> (0,1) -> (1,1) -> (1,0) -> back to (0,0)
    // For CW: interior is on the RIGHT, exterior on the LEFT
    const a = node('a', 0, 0);
    const b = node('b', 0, 1);
    const c = node('c', 1, 1);
    const d = node('d', 1, 0);

    const e1 = edge('e1', a, b, 'outside', 'inside');
    const e2 = edge('e2', b, c, 'outside', 'inside');
    const e3 = edge('e3', c, d, 'outside', 'inside');
    const e4 = edge('e4', d, a, 'outside', 'inside');

    const l = loop([e1, e2, e3, e4]);
    ensureEdgeLoopClockwiseOrder(l);

    // Should remain clockwise, innerAffiliation = 'inside' (rightAffiliation)
    expect(l.innerAffiliation).to.equal('inside');
    expect(l.outerAffiliation).to.equal('outside');
  });

  it('correctly reverses counter-clockwise loop', () => {
    // Counter-clockwise square in Y-up coordinates (positive signed area)
    // (0,0) -> (1,0) -> (1,1) -> (0,1) -> back to (0,0)
    // For CCW: interior is on the LEFT, exterior on the RIGHT
    const a = node('a', 0, 0);
    const b = node('b', 1, 0);
    const c = node('c', 1, 1);
    const d = node('d', 0, 1);

    const e1 = edge('e1', a, b, 'inside', 'outside');
    const e2 = edge('e2', b, c, 'inside', 'outside');
    const e3 = edge('e3', c, d, 'inside', 'outside');
    const e4 = edge('e4', d, a, 'inside', 'outside');

    const l = loop([e1, e2, e3, e4]);
    ensureEdgeLoopClockwiseOrder(l);

    // Should be reversed to clockwise, innerAffiliation = 'inside'
    // (after reversal, left/right are swapped, so rightAffiliation becomes 'inside')
    expect(l.innerAffiliation).to.equal('inside');
    expect(l.outerAffiliation).to.equal('outside');
  });

  it('handles degenerate loop (less than 3 edges)', () => {
    const a = node('a', 0, 0);
    const b = node('b', 1, 0);

    const e1 = edge('e1', a, b, 'outside', 'inside');
    const l = loop([e1]);

    ensureEdgeLoopClockwiseOrder(l);

    // Should not crash, should set affiliations from first edge
    expect(l.innerAffiliation).to.equal('inside');
    expect(l.outerAffiliation).to.equal('outside');
  });

  it('reproduction: FWL/MoC border - correct winding for enclave', () => {
    // Regression for "portion of border between FWL & MoC is malformed".
    // An MoC enclave inside FWL should have correct innerAffiliation = MoC.
    const FWL = 'FWL';
    const MOC = 'MoC';

    // MoC enclave (clockwise in Y-up: negative signed area)
    // (3,3) -> (3,5) -> (5,5) -> (5,3) -> back to (3,3)
    // For CW: interior (MoC) is on the RIGHT, exterior (FWL) on the LEFT
    const m1 = node('m1', 3, 3);
    const m2 = node('m2', 3, 5);
    const m3 = node('m3', 5, 5);
    const m4 = node('m4', 5, 3);

    const e1 = edge('e1', m1, m2, FWL, MOC);
    const e2 = edge('e2', m2, m3, FWL, MOC);
    const e3 = edge('e3', m3, m4, FWL, MOC);
    const e4 = edge('e4', m4, m1, FWL, MOC);

    const l = loop([e1, e2, e3, e4]);
    ensureEdgeLoopClockwiseOrder(l);

    // innerAffiliation should be MoC (the rightAffiliation of clockwise loop)
    expect(l.innerAffiliation).to.equal(MOC);
    expect(l.outerAffiliation).to.equal(FWL);
  });
});
