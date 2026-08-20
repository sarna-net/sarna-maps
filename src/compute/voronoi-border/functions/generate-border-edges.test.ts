import { describe, it, expect } from 'vitest';
import { generateBorderEdges } from './generate-border-edges';
import { VoronoiBorderNode, BorderDelaunayVertex } from '../types';
import { SystemStateManager } from '../../../common/utils/system-state-manager';
import { System, Era, Faction } from '../../../common/types';

function createSystem(id: string, name: string, x: number, y: number, ...eraAffs: string[]): System {
  return {
    id, name, x, y,
    eraAffiliations: eraAffs,
    names: [],
    radiusX: 1, radiusY: 1, rotation: 0,
    areasOfInterest: [],
  } as System;
}

/**
 * Builds a minimal VoronoiBorderNode with the fields generateBorderEdges reads.
 */
function voronoiNode(
  id: string,
  x: number,
  y: number,
  vertexIndices: [number, number, number],
  neighbors: Array<number>,
): VoronoiBorderNode {
  return {
    id,
    x,
    y,
    vertex1Idx: vertexIndices[0],
    vertex2Idx: vertexIndices[1],
    vertex3Idx: vertexIndices[2],
    neighborNodeIndices: neighbors,
    borderAffiliations: {},
  };
}

/**
 * Builds a minimal Delaunay vertex carrying the full affiliation string that
 * extractBorderStateAffiliation canonicalizes.
 */
function vertex(id: string, x: number, y: number, affiliation: string): BorderDelaunayVertex {
  return { id, x, y, affiliation, systemId: id, eraIndex: 0, adjacentTriIndices: [] } as BorderDelaunayVertex;
}

describe('generateBorderEdges affiliation symmetry', () => {
  it('produces one consistent combined affiliation key for a shared edge between FWL and FWL|Region 3 vertices (levels>1)', () => {
    // Two adjacent voronoi nodes (node A and node B) that share two Delaunay
    // vertices. At affiliation level 2 the canonical affiliation of one shared
    // vertex is "FWL" and the other is "FWL|Region 3" (the `|` suffix path).
    const vertices: Array<BorderDelaunayVertex> = [
      vertex('v0', 0, 0, 'FWL'),                 // shared vertex 0 -> affiliation1
      vertex('v1', 10, 0, 'FWL,Marik'),          // shared vertex 1 -> affiliation2 (level-2 split)
      vertex('v2', 0, 10, 'DC'),                // A-exclusive vertex
      vertex('v3', 20, 0, 'DC'),                // B-exclusive vertex
    ];

    // Node A uses vertices v0, v1, v2; Node B uses vertices v0, v1, v3.
    // They share v0 and v1, so they are adjacent (>=2 shared vertices).
    const nodeA = voronoiNode('nA', 1, 1, [0, 1, 2], [1]);
    const nodeB = voronoiNode('nB', 5, 1, [0, 1, 3], [0]);

    const { borderEdges } = generateBorderEdges(
      [nodeA, nodeB],
      vertices,
      2, // affiliationLevels > 1 -> exercises the level-2 split canonical path
    );

    // Exactly one combined-affiliation bucket covering the single shared edge.
    const keys = Object.keys(borderEdges);
    expect(keys).to.have.length(1);
    const edges = borderEdges[keys[0]];
    expect(edges).to.have.length(1);

    // The combined key must be symmetric: [FWL, FWL,Marik] sorted and joined.
    const expectedKey = ['FWL', 'FWL,Marik'].sort().join('___');
    expect(keys[0]).to.equal(expectedKey);

    // The edge's affiliation1/affiliation2 must be identical regardless of which
    // endpoint is node1 vs node2 (symmetric per-edge computation).
    const edge = edges[0];
    const sorted = [edge.affiliation1, edge.affiliation2].sort().join('___');
    expect(sorted).to.equal(expectedKey);
  });

  it('produces identical results with or without stateManager (fallback compatibility)', () => {
    const vertices: Array<BorderDelaunayVertex> = [
      vertex('v0', 0, 0, 'FWL'),
      vertex('v1', 10, 0, 'DC'),
      vertex('v2', 0, 10, 'FWL'),
      vertex('v3', 20, 0, 'DC'),
    ];

    const nodeA = voronoiNode('nA', 1, 1, [0, 1, 2], [1]);
    const nodeB = voronoiNode('nB', 5, 1, [0, 1, 3], [0]);

    // Build a minimal stateManager with the same data
    const systems = [
      createSystem('v0', 'Sys0', 0, 0, 'FWL'),
      createSystem('v1', 'Sys1', 10, 0, 'DC'),
      createSystem('v2', 'Sys2', 0, 10, 'FWL'),
      createSystem('v3', 'Sys3', 20, 0, 'DC'),
    ];
    const eras: Era[] = [{ index: 0, name: 'Test', year: 3025 }];
    const factions: Record<string, Faction> = {
      FWL: { id: 'FWL', name: 'FWL', color: '#purple', founding: 2271, dissolution: 3067 } as Faction,
      DC: { id: 'DC', name: 'DC', color: '#red', founding: 2271, dissolution: 3067 } as Faction,
    };
    const stateManager = SystemStateManager.build(systems, eras, factions, 1);

    // Without stateManager (fallback path)
    const withoutSM = generateBorderEdges([nodeA, nodeB], vertices, 1);
    // With stateManager
    const withSM = generateBorderEdges([nodeA, nodeB], vertices, 1, stateManager);

    expect(Object.keys(withoutSM.borderEdges)).to.deep.equal(Object.keys(withSM.borderEdges));
  });
});
