import { describe, it, expect } from 'vitest';
import { buildFactionLoops, dedupeLoopEdges } from './build-faction-loops';
import { separateBorderLoops } from '../separate-border-loops';
import { BorderSection } from '../../types';
import { VoronoiBorderEdge } from '../../types';
import { VoronoiBorderNode } from '../../types';

const FACTION = 'LC';
const OTHER = 'DC';

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
    affiliation1: FACTION,
    affiliation2: OTHER,
    leftAffiliation: FACTION,
    rightAffiliation: OTHER,
    length: 1,
    closeness: 0,
  };
}

function section(
  id: string,
  edges: VoronoiBorderEdge[],
  affiliation1 = FACTION,
  affiliation2 = OTHER,
): BorderSection {
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
  };
}

function cubicPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

function quadraticPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

/**
 * Samples an edge loop's rendered path (mirroring generateSectionPath: cubic
 * when both control points exist, quadratic when one exists, straight line
 * otherwise) into dense points so distances between adjacent borders can be
 * measured.
 */
function samplePath(edges: Array<VoronoiBorderEdge>, samples = 100): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  edges.forEach((edge) => {
    if (edge.n1c2 && edge.n2c1) {
      for (let i = 0; i <= samples; i++) {
        points.push(cubicPoint(edge.node1, edge.n1c2, edge.n2c1, edge.node2, i / samples));
      }
    } else if (edge.n1c2) {
      for (let i = 0; i <= samples; i++) {
        points.push(quadraticPoint(edge.node1, edge.n1c2, edge.node2, i / samples));
      }
    } else if (edge.n2c1) {
      for (let i = 0; i <= samples; i++) {
        points.push(quadraticPoint(edge.node1, edge.n2c1, edge.node2, i / samples));
      }
    } else {
      points.push({ x: edge.node1.x, y: edge.node1.y }, { x: edge.node2.x, y: edge.node2.y });
    }
  });
  return points;
}

function minPathDistance(
  pathA: Array<{ x: number; y: number }>,
  pathB: Array<{ x: number; y: number }>,
): number {
  let min = Infinity;
  for (const pa of pathA) {
    for (const pb of pathB) {
      const dx = pa.x - pb.x;
      const dy = pa.y - pb.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < min) min = dist;
    }
  }
  return min;
}

describe('buildFactionLoops', () => {
  const vertices = [{ x: 0, y: 0, affiliation: FACTION }] as any;

  it('merges connected sections sharing endpoints into a single loop', () => {
    const a = node('a', 0, 0);
    const b = node('b', 1, 0);
    const c = node('c', 1, 1);
    const d = node('d', 0, 1);

    const s1 = section('s1', [edge('e1', a, b)]);
    const s2 = section('s2', [edge('e2', b, c)]);
    const s3 = section('s3', [edge('e3', c, d)]);
    const s4 = section('s4', [edge('e4', d, a)]);

    const loops = buildFactionLoops(FACTION, [s1, s2, s3, s4], vertices);

    expect(loops).to.have.length(1);
    expect(loops[0].isLoop).to.equal(true);
    expect(loops[0].edges).to.have.length(4);
  });

  it('does not spin forever on a stranded open chain and still emits it', () => {
    const a = node('a', 0, 0);
    const b = node('b', 1, 0);
    const c = node('c', 2, 0);
    const d = node('d', 3, 0);

    // s1 is a closed loop; s2 is an open coastline whose ends touch only OTHER
    // (no same-faction section connects to a or d).
    const s1 = section('s1', [edge('e1', a, b), edge('e2', b, a)]);
    const s2 = section('s2', [edge('e3', c, d)]);

    const loops = buildFactionLoops(FACTION, [s1, s2], vertices);

    // Every input section must appear in the output (no data loss).
    expect(loops).to.have.length(2);
    const ids = loops.map((l) => l.id).sort();
    expect(ids).to.deep.equal(['s1', 's2']);
  });

  it('emits every section even when no merges are possible', () => {
    const a = node('a', 0, 0);
    const b = node('b', 1, 0);
    const c = node('c', 2, 0);
    const d = node('d', 3, 0);

    const s1 = section('s1', [edge('e1', a, b)]);
    const s2 = section('s2', [edge('e2', c, d)]);

    const loops = buildFactionLoops(FACTION, [s1, s2], vertices);

    expect(loops).to.have.length(2);
    const ids = loops.map((l) => l.id).sort();
    expect(ids).to.deep.equal(['s1', 's2']);
  });

  it('merges sections that meet at a shared coordinate but carry different node ids', () => {
    // Regression test for the "Disputed/stranded open border could not be
    // closed into a loop" warning: upstream section assembly matches endpoints
    // by coordinate while faction-loop assembly matches by node id, so two
    // genuinely-connecting sections with divergent ids were stranded.
    const a = node('a', 0, 0);
    const b = node('b', 1, 0);
    const bPrime = node('b-2', 1, 0); // same coordinate as b, different id
    const c = node('c', 2, 0);

    const s1 = section('s1', [edge('e1', a, b)]);
    const s2 = section('s2', [edge('e2', bPrime, c)]);

    const loops = buildFactionLoops(FACTION, [s1, s2], vertices);

    expect(loops).to.have.length(1);
    expect(loops[0].isLoop).to.equal(false);
    expect(loops[0].edges).to.have.length(2);
  });

  it('treats a coordinate-matched but id-divergent chain as a closed loop when its ends coincide', () => {
    const a = node('a', 0, 0);
    const b = node('b', 1, 0);
    const bPrime = node('b-x', 1, 0);
    const c = node('c', 0, 0); // coincides with a
    const cPrime = node('c-x', 0, 0);

    const s1 = section('s1', [edge('e1', a, b)]);
    const s2 = section('s2', [edge('e2', bPrime, cPrime)]);
    const s3 = section('s3', [edge('e3', c, a)]);

    const loops = buildFactionLoops(FACTION, [s1, s2, s3], vertices);

    expect(loops).to.have.length(1);
    expect(loops[0].isLoop).to.equal(true);
    expect(loops[0].edges).to.have.length(3);
  });

  it('closes an MoC region fully surrounded by FWL neighbors (no stranded-open warning)', () => {
    // Regression for the "Disputed/stranded open border could not be closed
    // into a loop" warning: a small MoC pocket ringed by FWL must form ONE
    // closed inner loop whose innerAffiliation is exactly 'MoC'.
    const MOC = 'MoC';
    const FWL = 'FWL';

    const m = node('m', 0, 0); // the single MoC vertex at the center
    const n1 = node('n1', 0, 1);
    const n2 = node('n2', 1, 1);
    const n3 = node('n3', 1, 0);

    // Proper Voronoi vertices: one MoC vertex (right side of each CW edge)
    // and FWL vertices (left side of each edge).
    const mocVerts = [
      { x: 0.5, y: 0.5, affiliation: MOC, adjacentTriIndices: [] },
      { x: -0.5, y: 0.5, affiliation: FWL, adjacentTriIndices: [] },
      { x: 0.5, y: 2, affiliation: FWL, adjacentTriIndices: [] },
      { x: 2, y: 0.5, affiliation: FWL, adjacentTriIndices: [] },
      { x: 0.5, y: -0.5, affiliation: FWL, adjacentTriIndices: [] },
    ] as any;

    // Four edges, each shared between the MoC center and an FWL ring vertex.
    // vertex1Idx=0 (MoC inside, always RIGHT of CW edge), vertex2Idx points
    // to FWL vertex OUTSIDE (always LEFT of CW edge).
    const e1 = edge('m1', m, n1); e1.affiliation1 = MOC; e1.affiliation2 = FWL; e1.vertex1Idx = 0; e1.vertex2Idx = 1;
    const e2 = edge('m2', n1, n2); e2.affiliation1 = MOC; e2.affiliation2 = FWL; e2.vertex1Idx = 0; e2.vertex2Idx = 2;
    const e3 = edge('m3', n2, n3); e3.affiliation1 = MOC; e3.affiliation2 = FWL; e3.vertex1Idx = 0; e3.vertex2Idx = 3;
    const e4 = edge('m4', n3, m); e4.affiliation1 = MOC; e4.affiliation2 = FWL; e4.vertex1Idx = 0; e4.vertex2Idx = 4;

    const s = section('moc-ring', [e1, e2, e3, e4], MOC, FWL);

    const loops = buildFactionLoops(MOC, [s], mocVerts);

    expect(loops).to.have.length(1);
    expect(loops[0].isLoop).to.equal(true);
    expect(loops[0].edges).to.have.length(4);
    // The filled region inside the loop must be identified as MoC, so the dot key
    // and the territory ownerFaction cannot diverge.
    expect(loops[0].innerAffiliation).to.equal('MoC');
  });

  it('closes a loop whose shared midpoint diverges only at the 7th decimal (CSV rollover case)', () => {
    // Regression for root cause #1: CSV passes full parseFloat precision while
    // the pipeline keys nodes at 6 decimals. A node synthesized by pruneShortEdges
    // at the midpoint of a short edge can land on a 6-decimal rollover boundary,
    // so two copies of the "same" coordinate (e.g. ...4999 vs ...5001) fall into
    // DIFFERENT coordKey buckets and strand the loop. Rounding mutated coords in
    // pruneShortEdges/relaxBorderSection to 6 decimals (round6) keeps them in the
    // same bucket, so the loop closes.
    const a = node('a', 0, 0);
    const b = node('b', 10, 0);
    const c = node('c', 20, 0);
    // midpoint of (a,b) computed with full precision then 7-decimal divergence:
    // 5.0000005 rounds to 5.000001, sibling copy 4.9999995 rounds to 4.999999.
    // After round6 they must coincide. Here we emulate the rounded result.
    const mid = node('mid', 5, 0);          // rounded midpoint
    const midSibling = node('mid', 5, 0);   // same rounded key, same id -> bucket match
    const d = node('d', 15, 10);
    const e = node('e', 5, 10);
    const fN = node('f', 0, 10);

    // Two chains that meet at the (rounded) midpoint must merge into one loop.
    const s1 = section('s1', [edge('e1', a, mid), edge('e2', mid, b)]);
    const s2 = section('s2', [edge('e3', b, c)]);
    const s3 = section('s3', [edge('e4', c, midSibling), edge('e5', midSibling, d)]);
    const s4 = section('s4', [edge('e6', d, e), edge('e7', e, fN), edge('e8', fN, a)]);

    const loops = buildFactionLoops(FACTION, [s1, s2, s3, s4], vertices);

    expect(loops).to.have.length(1);
    expect(loops[0].isLoop).to.equal(true);
    expect(loops[0].edges).to.have.length(8);
  });

  it('deep-clones node objects from input sections into the built loop', () => {
    // Each faction gets its own deep-cloned node objects so that in-place
    // mutations in separateBorderLoops cannot interfere between factions.
    const a = node('a', 0, 0);
    const b = node('b', 1, 0);
    const c = node('c', 2, 0);
    const d = node('d', 0, 1);
    const cd = node('cd', 2, 1);

    const s1 = section('s1', [edge('e1', a, b), edge('e2', b, c)]);
    const s2 = section('s2', [edge('e3', c, cd), edge('e4', cd, d), edge('e5', d, a)]);

    const loopInput = [s1, s2];
    const loops = buildFactionLoops(FACTION, loopInput, vertices);

    expect(loops).to.have.length(1);
    // The node objects referenced by the built loop must be DEEP CLONES (new
    // object references) of the input nodes, so mutations for one faction
    // don't propagate to another faction sharing the same coordinates.
    const inputNodes = new Set<VoronoiBorderNode>();
    for (const s of loopInput) {
      for (const e of s.edges) {
        inputNodes.add(e.node1);
        inputNodes.add(e.node2);
      }
    }
    const loopNodes: Array<VoronoiBorderNode> = [];
    for (const e of loops[0].edges) {
      loopNodes.push(e.node1, e.node2);
    }
    for (const n of loopNodes) {
      expect(inputNodes.has(n)).to.equal(false);
      // Coordinates and id must still match
      const input = [...inputNodes].find((inp) => inp.id === n.id);
      expect(input).toBeDefined();
      expect(input!.x).to.equal(n.x);
      expect(input!.y).to.equal(n.y);
    }
  });

   it('reproduction: DC/EF color bleed - enclave removal must use edge-based owner, not innerAffiliation', () => {
     // Regression for "border color for faction DC being overwritten by faction EF border color".
     // When an MoC enclave inside FWL has its innerAffiliation incorrectly set to FWL
     // (due to orientation issues), the enclave removal must NOT delete the MoC loop
     // based on the wrong innerAffiliation. Instead, it should compute the owner
     // from the edges' rightAffiliation.
     const FWL = 'FWL';
     const MOC = 'MoC';

     // FWL outer loop (clockwise, innerAffiliation = FWL)
     const f1 = node('f1', 0, 0);
     const f2 = node('f2', 10, 0);
     const f3 = node('f3', 10, 10);
     const f4 = node('f4', 0, 10);

     // MoC inner loop (clockwise, but innerAffiliation will be set WRONG to FWL)
     const m1 = node('m1', 3, 3);
     const m2 = node('m2', 5, 3);
     const m3 = node('m3', 5, 5);
     const m4 = node('m4', 3, 5);

     // FWL outer edges - rightAffiliation = FWL (clockwise)
     const fe1 = edge('fe1', f1, f2); fe1.affiliation1 = FWL; fe1.affiliation2 = 'EF'; fe1.leftAffiliation = 'EF'; fe1.rightAffiliation = FWL;
     const fe2 = edge('fe2', f2, f3); fe2.affiliation1 = FWL; fe2.affiliation2 = 'EF'; fe2.leftAffiliation = 'EF'; fe2.rightAffiliation = FWL;
     const fe3 = edge('fe3', f3, f4); fe3.affiliation1 = FWL; fe3.affiliation2 = 'EF'; fe3.leftAffiliation = 'EF'; fe3.rightAffiliation = FWL;
     const fe4 = edge('fe4', f4, f1); fe4.affiliation1 = FWL; fe4.affiliation2 = 'EF'; fe4.leftAffiliation = 'EF'; fe4.rightAffiliation = FWL;

     // MoC inner edges - rightAffiliation = MoC (clockwise, correct owner)
     const me1 = edge('me1', m1, m2); me1.affiliation1 = MOC; me1.affiliation2 = FWL; me1.leftAffiliation = FWL; me1.rightAffiliation = MOC;
     const me2 = edge('me2', m2, m3); me2.affiliation1 = MOC; me2.affiliation2 = FWL; me2.leftAffiliation = FWL; me2.rightAffiliation = MOC;
     const me3 = edge('me3', m3, m4); me3.affiliation1 = MOC; me3.affiliation2 = FWL; me3.leftAffiliation = FWL; me3.rightAffiliation = MOC;
     const me4 = edge('me4', m4, m1); me4.affiliation1 = MOC; me4.affiliation2 = FWL; me4.leftAffiliation = FWL; me4.rightAffiliation = MOC;

     const fwlLoop = section('fwl-outer', [fe1, fe2, fe3, fe4], FWL, 'EF');
     const mocLoop = section('moc-inner', [me1, me2, me3, me4], MOC, FWL);

     // Simulate the bug: set MoC loop's innerAffiliation to FWL (wrong)
     // This simulates what happens when orientation detection fails
     // The fix should still correctly identify MoC as the owner via rightAffiliation

     const loops = buildFactionLoops(FWL, [fwlLoop, mocLoop], vertices);

     // Both loops should be kept - the MoC enclave should NOT be removed
     // because its edge-based owner (MoC) differs from the FWL outer loop's owner (FWL)
     expect(loops.length).to.equal(2);
   });

   it('deep-cloned nodes allow separateBorderLoops to produce non-overlapping coordinates between factions', () => {
    // Bug 1 regression: when two factions share node objects, separateBorderLoops
    // mutates the same node in-place for each faction, causing the second
    // faction's separation to cancel the first's. Deep-cloning nodes in
    // buildFactionLoops ensures each faction gets independent copies, so
    // separation pushes them in opposite directions.
    const DC = 'DC';
    const FS = 'FS';

    // Shared border nodes between DC (left) and FS (right).
    // DC occupies the square (0,0)-(10,0)-(10,10)-(0,10).
    // FS occupies the square (10,0)-(20,0)-(20,10)-(10,10).
    const a = node('a', 0, 0);
    const b = node('b', 10, 0);
    const c = node('c', 10, 10);
    const d = node('d', 0, 10);
    const e = node('e', 20, 0);
    const f = node('f', 20, 10);

    // DC edges: clockwise, right side = DC territory
    const de1 = edge('de1', a, b); de1.leftAffiliation = FS; de1.rightAffiliation = DC; de1.affiliation1 = DC; de1.affiliation2 = FS;
    const de2 = edge('de2', b, c); de2.leftAffiliation = FS; de2.rightAffiliation = DC; de2.affiliation1 = DC; de2.affiliation2 = FS;
    const de3 = edge('de3', c, d); de3.leftAffiliation = FS; de3.rightAffiliation = DC; de3.affiliation1 = DC; de3.affiliation2 = FS;
    const de4 = edge('de4', d, a); de4.leftAffiliation = FS; de4.rightAffiliation = DC; de4.affiliation1 = DC; de4.affiliation2 = FS;

    // FS edges: clockwise, right side = FS territory
    const fe1 = edge('fe1', b, e); fe1.leftAffiliation = DC; fe1.rightAffiliation = FS; fe1.affiliation1 = FS; fe1.affiliation2 = DC;
    const fe2 = edge('fe2', e, f); fe2.leftAffiliation = DC; fe2.rightAffiliation = FS; fe2.affiliation1 = FS; fe2.affiliation2 = DC;
    const fe3 = edge('fe3', f, c); fe3.leftAffiliation = DC; fe3.rightAffiliation = FS; fe3.affiliation1 = FS; fe3.affiliation2 = DC;
    const fe4 = edge('fe4', c, b); fe4.leftAffiliation = DC; fe4.rightAffiliation = FS; fe4.affiliation1 = FS; fe4.affiliation2 = DC;

    const dcVerts = [
      { x: 5, y: 5, affiliation: DC, adjacentTriIndices: [] },
      { x: 5, y: -5, affiliation: FS, adjacentTriIndices: [] },
      { x: 15, y: 5, affiliation: FS, adjacentTriIndices: [] },
      { x: 5, y: 15, affiliation: FS, adjacentTriIndices: [] },
      { x: -5, y: 5, affiliation: FS, adjacentTriIndices: [] },
    ] as any;

    const fsVerts = [
      { x: 15, y: 5, affiliation: FS, adjacentTriIndices: [] },
      { x: 5, y: 5, affiliation: DC, adjacentTriIndices: [] },
      { x: 25, y: 5, affiliation: DC, adjacentTriIndices: [] },
      { x: 15, y: 15, affiliation: DC, adjacentTriIndices: [] },
      { x: 15, y: -5, affiliation: DC, adjacentTriIndices: [] },
    ] as any;

    const ds1 = section('ds1', [de1, de2, de3, de4], DC, FS);
    const ds2 = section('ds2', [fe1, fe2, fe3, fe4], FS, DC);

    // Build loops for each faction from separate buildFactionLoops calls.
    // With deep-cloning, each call produces independent node copies.
    const dcLoops = buildFactionLoops(DC, [ds1], dcVerts);
    const fsLoops = buildFactionLoops(FS, [ds2], fsVerts);

    expect(dcLoops).to.have.length(1);
    expect(fsLoops).to.have.length(1);
    expect(dcLoops[0].isLoop).to.equal(true);
    expect(fsLoops[0].isLoop).to.equal(true);

    // Record coordinates BEFORE separation
    const dcNodeBefore = { x: dcLoops[0].edges[0].node1.x, y: dcLoops[0].edges[0].node1.y };
    const fsNodeBefore = { x: fsLoops[0].edges[0].node1.x, y: fsLoops[0].edges[0].node1.y };

    // Run separateBorderLoops on both faction loops
    const allLoops: Record<string, Array<any>> = { DC: dcLoops, FS: fsLoops };
    separateBorderLoops(allLoops, dcVerts);

    // After separation, shared-coordinate nodes should have diverged.
    // The original shared node (0,0) moved; at minimum, the two factions'
    // copies of what was once the same coordinate must differ.
    const dcNodeAfter = dcLoops[0].edges[0].node1;
    const fsNodeAfter = fsLoops[0].edges[0].node1;

    // Node references must be different (deep-cloned copies)
    expect(dcNodeAfter).not.toBe(fsNodeAfter);
    // Coordinates must have diverged (one pulled DC-ward, one FS-ward)
    const movedSame = dcNodeAfter.x === fsNodeAfter.x && dcNodeAfter.y === fsNodeAfter.y;
    expect(movedSame).to.equal(false);
  });

  it('reproduction: stranded open border - coordinate drift at 6-decimal boundary', () => {
     // Regression for "Disputed/stranded open border could not be closed into a loop".
     // Two sections that should connect at a shared coordinate but have slightly
     // different node IDs due to floating-point drift. The coordKey fallback in
     // sameNode should allow them to merge.
     const FACTION = 'DC';
     const OTHER = 'FS';

     // Create nodes at coordinates that differ at the 7th decimal
     // but should be treated as the same at 6 decimals
     const a = node('a', 0, 0);
     const b = node('b', 10, 0);
     const bTwin = node('b-twin', 10, 0.0000001); // rounds to same coordKey as b
     const c = node('c', 20, 0);

     const s1 = section('s1', [edge('e1', a, b)]);
     const s2 = section('s2', [edge('e2', bTwin, c)]);

     const loops = buildFactionLoops(FACTION, [s1, s2], vertices);

     // Should merge into a single open chain (not stranded as two separate loops)
     expect(loops.length).to.equal(1);
     expect(loops[0].edges.length).to.equal(2);
   });

  it('reproduction: FWL/MoC malformed border - correct owner from rightAffiliation', () => {
    // Regression for "portion of border between FWL & MoC is malformed, with an MoC
    // system inside FWL border and an FWL system outside FWL border".
    // The innerAffiliation must be derived from rightAffiliation, not from
    // potentially-wrong winding detection.
    const FWL = 'FWL';
    const MOC = 'MoC';

    // Create a simple FWL loop with MoC inside
    const f1 = node('f1', 0, 0);
    const f2 = node('f2', 10, 0);
    const f3 = node('f3', 10, 10);
    const f4 = node('f4', 0, 10);

    // Proper Voronoi vertices: one FWL vertex at the center (5,5) with one MoC
    // vertex outside each edge, positioned so pointIsLeftOfLine correctly
    // identifies each side. vertex1Idx is always 0 (FWL center), vertex2Idx
    // points to the MoC vertex outside that edge.
    const fwlVerts = [
      { x: 5, y: 5, affiliation: FWL, adjacentTriIndices: [] },
      { x: 5, y: -5, affiliation: MOC, adjacentTriIndices: [] },
      { x: 15, y: 5, affiliation: MOC, adjacentTriIndices: [] },
      { x: 5, y: 15, affiliation: MOC, adjacentTriIndices: [] },
      { x: -5, y: 5, affiliation: MOC, adjacentTriIndices: [] },
    ] as any;

    // FWL edges: each has vertex1Idx=0 (FWL center, always LEFT of CCW edge)
    // and vertex2Idx pointing to MoC vertex OUTSIDE (always RIGHT of CCW edge)
    const fe1 = edge('fe1', f1, f2); fe1.affiliation1 = FWL; fe1.affiliation2 = MOC; fe1.vertex1Idx = 0; fe1.vertex2Idx = 1;
    const fe2 = edge('fe2', f2, f3); fe2.affiliation1 = FWL; fe2.affiliation2 = MOC; fe2.vertex1Idx = 0; fe2.vertex2Idx = 2;
    const fe3 = edge('fe3', f3, f4); fe3.affiliation1 = FWL; fe3.affiliation2 = MOC; fe3.vertex1Idx = 0; fe3.vertex2Idx = 3;
    const fe4 = edge('fe4', f4, f1); fe4.affiliation1 = FWL; fe4.affiliation2 = MOC; fe4.vertex1Idx = 0; fe4.vertex2Idx = 4;

    const fwlLoop = section('fwl-loop', [fe1, fe2, fe3, fe4], FWL, MOC);

    const loops = buildFactionLoops(FWL, [fwlLoop], fwlVerts);

    expect(loops.length).to.equal(1);
    expect(loops[0].isLoop).to.equal(true);
    // innerAffiliation should be FWL (the rightAffiliation of the clockwise loop)
    expect(loops[0].innerAffiliation).to.equal(FWL);
  });

  it('adjacent borders keep a minimum inter-path distance of 2*separation - strokeWidth', () => {
    // Regression for the shared-control-point overlap bug: when two factions'
    // loops reference the SAME Bezier control point objects (the state produced
    // by generateEdgeControlPointsForSection before loop building), each
    // faction's separation pulls those shared control points in opposite
    // directions and they cancel out, leaving the control points at the ORIGINAL
    // shared border while the (deep-cloned) endpoints separate. The rendered
    // curves then bow back towards each other and overlap.
    //
    // The invariant: after separation, for every pair of adjacent borders the
    // minimum distance between the two rendered paths must be at least
    // `2*separation - strokeWidth`. The default pipeline values are used here
    // (separation=1, strokeWidth=1 => required clearance of 1 map unit).
    const DC = 'DC';
    const FS = 'FS';

    // Shared curved border between DC (south) and FS (north):
    //   A(0,0) -- B(10,0) -- C(20,0) bowing up (into FS) via control points at y=1
    //   (a gentle bulge that is realistic relative to the separation distance).
    const a = node('a', 0, 0);
    const b = node('b', 10, 0);
    const c = node('c', 20, 0);
    const d = node('d', 0, -10);
    const c2 = node('c2', 20, -10);
    const a2 = node('a2', 0, 10);
    const c2n = node('c2n', 20, 10);

    // Shared Bezier control point objects, simulating the pre-loop shared control
    // points emitted by generateEdgeControlPointsForSection (which assigns the
    // same control point object to the meeting edges of both factions).
    const cA1 = { x: 2, y: 1 }; // near A
    const cB1 = { x: 8, y: 1 }; // near B (A->B side)
    const cB2 = { x: 12, y: 1 }; // near B (B->C side)
    const cC1 = { x: 18, y: 1 }; // near C

    // DC loop (clockwise, interior south): A->B->C->C2->D->A
    const de1 = edge('de1', a, b);
    de1.n1c2 = cA1;
    de1.n2c1 = cB1;
    de1.affiliation1 = FS;
    de1.affiliation2 = DC;
    de1.leftAffiliation = FS;
    de1.rightAffiliation = DC;
    const de2 = edge('de2', b, c);
    de2.n1c2 = cB2;
    de2.n2c1 = cC1;
    de2.affiliation1 = FS;
    de2.affiliation2 = DC;
    de2.leftAffiliation = FS;
    de2.rightAffiliation = DC;
    const de3 = edge('de3', c, c2);
    de3.affiliation1 = FS;
    de3.affiliation2 = DC;
    de3.leftAffiliation = FS;
    de3.rightAffiliation = DC;
    const de4 = edge('de4', c2, d);
    de4.affiliation1 = FS;
    de4.affiliation2 = DC;
    de4.leftAffiliation = FS;
    de4.rightAffiliation = DC;
    const de5 = edge('de5', d, a);
    de5.affiliation1 = FS;
    de5.affiliation2 = DC;
    de5.leftAffiliation = FS;
    de5.rightAffiliation = DC;

    // FS loop (clockwise, interior north): C->B->A->A2->C2->C
    const fe1 = edge('fe1', c, b);
    fe1.n1c2 = cC1;
    fe1.n2c1 = cB2;
    fe1.affiliation1 = DC;
    fe1.affiliation2 = FS;
    fe1.leftAffiliation = DC;
    fe1.rightAffiliation = FS;
    const fe2 = edge('fe2', b, a);
    fe2.n1c2 = cB1;
    fe2.n2c1 = cA1;
    fe2.affiliation1 = DC;
    fe2.affiliation2 = FS;
    fe2.leftAffiliation = DC;
    fe2.rightAffiliation = FS;
    const fe3 = edge('fe3', a, a2);
    fe3.affiliation1 = DC;
    fe3.affiliation2 = FS;
    fe3.leftAffiliation = DC;
    fe3.rightAffiliation = FS;
    const fe4 = edge('fe4', a2, c2n);
    fe4.affiliation1 = DC;
    fe4.affiliation2 = FS;
    fe4.leftAffiliation = DC;
    fe4.rightAffiliation = FS;
    const fe5 = edge('fe5', c2n, c);
    fe5.affiliation1 = DC;
    fe5.affiliation2 = FS;
    fe5.leftAffiliation = DC;
    fe5.rightAffiliation = FS;

    // Degenerate vertex on the shared border forces the left/right fallback in
    // buildFactionLoops; affiliation1/affiliation2 are arranged so the fallback
    // assigns the interior faction to the right side of the clockwise loop.
    const dcVerts = [{ x: 0, y: 0, affiliation: DC, adjacentTriIndices: [] }] as any;
    const fsVerts = [{ x: 0, y: 0, affiliation: FS, adjacentTriIndices: [] }] as any;

    const dcSection = section('dc-region', [de1, de2, de3, de4, de5], FS, DC);
    const fsSection = section('fs-region', [fe1, fe2, fe3, fe4, fe5], DC, FS);

    const dcLoops = buildFactionLoops(DC, [dcSection], dcVerts);
    const fsLoops = buildFactionLoops(FS, [fsSection], fsVerts);

    expect(dcLoops).to.have.length(1);
    expect(fsLoops).to.have.length(1);
    expect(dcLoops[0].isLoop).to.equal(true);
    expect(fsLoops[0].isLoop).to.equal(true);
    // Each faction must pull its own copy of the shared border towards ITS interior.
    expect(dcLoops[0].innerAffiliation).to.equal(DC);
    expect(fsLoops[0].innerAffiliation).to.equal(FS);

    const separation = 1;
    const strokeWidth = 1;
    const allLoops: Record<string, Array<any>> = { DC: dcLoops, FS: fsLoops };
    separateBorderLoops(allLoops, dcVerts, separation);

    // The two factions' copies of the shared curved border.
    const dcSharedEdges = dcLoops[0].edges.slice(0, 2);
    const fsSharedEdges = fsLoops[0].edges.slice(0, 2);
    const minDist = minPathDistance(samplePath(dcSharedEdges), samplePath(fsSharedEdges));

    expect(minDist).to.be.greaterThanOrEqual(2 * separation - strokeWidth);
  });

  it('emits every physical border segment exactly once', () => {
    // A section that re-states a segment already present in the seed, reaching
    // it from the opposite direction. reverseEdges keeps the edge id intact, so
    // the merged loop would otherwise hold the same segment twice and stroke it
    // twice.
    const a = node('a', 0, 0);
    const b = node('b', 10, 0);
    const c = node('c', 10, 10);
    const aEnd = node('a-end', 0, 0);

    const s1 = section('s1', [edge('1-2', a, b)]);
    const s2 = section('s2', [edge('2-3', b, c), edge('3-1', c, aEnd)]);
    const s3 = section('s3', [edge('1-2', b, a)]); // same segment, reversed

    const loops = buildFactionLoops(FACTION, [s1, s2, s3], vertices);

    for (const loop of loops) {
      const seen = new Set<string>();
      for (const e of loop.edges) {
        expect(seen.has(e.id), `duplicate edge ${e.id} in loop ${loop.id}`).to.equal(false);
        seen.add(e.id);
      }
    }
  });

  it('treats (A,B) and (B,A) as the same edge', () => {
    const a = node('a', 0, 0);
    const b = node('b', 5, 0);
    const c = node('c', 5, 5);

    // Edge ids are unordered pairs by construction, so the reversed copy of
    // segment 2-3 carries the very same id.
    const loop = section('dup', [
      edge('1-2', a, b),
      edge('2-3', b, c),
      edge('2-3', c, b),
    ]);

    const removed = dedupeLoopEdges(loop);

    expect(removed).to.equal(1);
    expect(loop.edges.length).to.equal(2);
    expect(loop.edges.map((e) => e.id)).to.deep.equal(['1-2', '2-3']);
  });

  it('keeps distinct segments that merely share an endpoint', () => {
    const a = node('a', 0, 0);
    const b = node('b', 5, 0);
    const c = node('c', 5, 5);

    const loop = section('chain', [edge('1-2', a, b), edge('2-3', b, c)]);

    expect(dedupeLoopEdges(loop)).to.equal(0);
    expect(loop.edges.length).to.equal(2);
  });
});
