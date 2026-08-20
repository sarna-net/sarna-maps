import { describe, it, expect } from 'vitest';
import { separateBorderLoops } from './separate-border-loops';
import { BorderEdgeLoop, VoronoiBorderNode } from '../types';

function node(id: string, x: number, y: number): VoronoiBorderNode {
  return {
    id,
    x,
    y,
    vertex1Idx: 0,
    vertex2Idx: 0,
    vertex3Idx: 0,
    neighborNodeIndices: [],
    borderAffiliations: { FS: true, LC: true },
  };
}

function edge(
  id: string,
  node1: VoronoiBorderNode,
  node2: VoronoiBorderNode,
) {
  return {
    id,
    node1,
    node2,
    vertex1Idx: 0,
    vertex2Idx: 0,
    affiliation1: 'FS',
    affiliation2: 'LC',
    leftAffiliation: 'FS',
    rightAffiliation: 'LC',
    length: 1,
    closeness: 10,
  };
}

/**
 * Builds a closed triangular loop with a 90-degree corner at node B.
 * A=(0,0) -> B=(10,0) -> C=(10,10) -> back to A.
 */
function rightAngleLoop(): { loop: BorderEdgeLoop; A: VoronoiBorderNode; B: VoronoiBorderNode; C: VoronoiBorderNode } {
  const A = node('A', 0, 0);
  const B = node('B', 10, 0);
  const C = node('C', 10, 10);
  const loop: BorderEdgeLoop = {
    id: 'tri',
    isLoop: true,
    innerAffiliation: 'FS',
    outerAffiliation: 'LC',
    length: 30,
    minEdgeIdx: 0,
    edges: [
      edge('e1', A, B),
      edge('e2', B, C),
      edge('e3', C, A),
    ],
  };
  return { loop, A, B, C };
}

/** Perpendicular component of displacement D relative to a unit edge direction. */
function perpendicularInset(D: { x: number; y: number }, dirX: number, dirY: number): number {
  const along = D.x * dirX + D.y * dirY;
  const perpX = D.x - along * dirX;
  const perpY = D.y - along * dirY;
  return Math.sqrt(perpX * perpX + perpY * perpY);
}

describe('separateBorderLoops uniform inset', () => {
  it('insets a 90-degree corner by exactly `separation` perpendicular to each edge', () => {
    const { loop, A, B, C } = rightAngleLoop();
    // Deep-copy the original corner positions before the call mutates them.
    const origA = { x: A.x, y: A.y };
    const origB = { x: B.x, y: B.y };
    const origC = { x: C.x, y: C.y };

    separateBorderLoops({ FS: [loop] }, [], 0.5);

    // Displacement of the 90-degree corner node B.
    const dB = { x: B.x - origB.x, y: B.y - origB.y };
    // Edge A->B direction (unit).
    const e1x = (origB.x - origA.x);
    const e1y = (origB.y - origA.y);
    const e1len = Math.sqrt(e1x * e1x + e1y * e1y);
    // Edge B->C direction (unit).
    const e2x = (origC.x - origB.x);
    const e2y = (origC.y - origB.y);
    const e2len = Math.sqrt(e2x * e2x + e2y * e2y);

    expect(perpendicularInset(dB, e1x / e1len, e1y / e1len)).to.be.closeTo(0.5, 1e-9);
    expect(perpendicularInset(dB, e2x / e2len, e2y / e2len)).to.be.closeTo(0.5, 1e-9);
  });

  it('insets a straight edge by exactly `separation`', () => {
    // Collinear A-B-C (no corner): displacement must equal the normal separation.
    const A = node('A', 0, 0);
    const B = node('B', 10, 0);
    const C = node('C', 20, 0);
    // Close the loop with a far edge so isLoop holds but B stays on a straight run.
    const D = node('D', 20, -100);
    const E = node('E', 0, -100);
    const loop: BorderEdgeLoop = {
      id: 'straight',
      isLoop: true,
      innerAffiliation: 'FS',
      outerAffiliation: 'LC',
      length: 1,
      minEdgeIdx: 0,
      edges: [
        edge('e1', A, B),
        edge('e2', B, C),
        edge('e3', C, D),
        edge('e4', D, E),
        edge('e5', E, A),
      ],
    };
    const origB = { x: B.x, y: B.y };

    separateBorderLoops({ FS: [loop] }, [], 0.5);

    const dB = { x: B.x - origB.x, y: B.y - origB.y };
    // Edge direction is +x; perpendicular inset is |dy|.
    expect(Math.abs(dB.y)).to.be.closeTo(0.5, 1e-9);
  });
});
