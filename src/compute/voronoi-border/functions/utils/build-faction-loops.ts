import { BorderDelaunayVertex, BorderSection, VoronoiBorderEdge, VoronoiBorderNode } from '../../types';
import { logger, pointIsLeftOfLine } from '../../../../common';
import { reverseEdges } from './reverse-edges';
import { ensureEdgeLoopClockwiseOrder } from '../ensure-edge-loop-clockwise-order';
import { coordKey } from './node-coord-key';

/**
 * Two endpoints count as the same node when their ids match *or* (as a
 * defensive fallback) when they sit at the same coordinate. The id-based match
 * is canonical after `normalizeBorderNodeIds`, but the coordinate fallback
 * protects against any future divergence between section assembly (which
 * matches by coordinate) and faction-loop assembly (which matches by id).
 * Uses the shared `coordKey` (single equality primitive) to avoid
 * floating-point drift issues.
 */
function sameNode(a: VoronoiBorderNode, b: VoronoiBorderNode): boolean {
  return a.id === b.id || coordKey(a.x, a.y) === coordKey(b.x, b.y);
}

/**
 * Canonical, direction-independent identity for a border edge.
 *
 * `generateBorderEdges` builds ids as `[nodeIdx, neighborIdx].sort().join('-')`,
 * so the id ALREADY denotes an unordered node pair: `A -> B` and `B -> A` share
 * one id. `reverseEdges` deliberately preserves it across a flip. That makes the
 * id the precise identity of a physical segment, and it stays correct even for
 * synthetic nodes whose coordinates were moved by the simplify passes.
 *
 * Edges without an id fall back to their unordered coordinate pair.
 */
function undirectedEdgeKey(edge: VoronoiBorderEdge): string {
  if (edge.id) {
    return `id:${edge.id}`;
  }
  const a = coordKey(edge.node1.x, edge.node1.y);
  const b = coordKey(edge.node2.x, edge.node2.y);
  return a < b ? `xy:${a}|${b}` : `xy:${b}|${a}`;
}

/**
 * Removes duplicate edges from an assembled loop, keeping the first occurrence.
 *
 * A section can be merged into a seed that already covers the same physical
 * segment from the opposite direction (`buildFactionLoops` reverses candidates
 * when their endpoints match tail-to-tail). Because `reverseEdges` keeps the
 * edge id intact, the merged loop then holds two edges denoting one segment,
 * and `generateSectionPath` emits — and strokes — that sub-path twice.
 *
 * @param loop The loop whose edge list will be de-duplicated in place
 * @returns The number of edges removed
 */
export function dedupeLoopEdges(loop: BorderSection): number {
  const seen = new Set<string>();
  const before = loop.edges.length;
  loop.edges = loop.edges.filter((edge) => {
    const key = undirectedEdgeKey(edge);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  return before - loop.edges.length;
}

/**
 * Builds closed border loops for a single faction by merging all of its
 * sections together.
 *
 * The merge is driven by an endpoint -> sections index keyed on node `id`
 * (stable strings) rather than by always extending `sections[0]`. This
 * guarantees every section is visited and merged regardless of seed order,
 * and removes the previous spin-to-the-cap failure mode: when a section
 * cannot be merged (disconnected island / T-junction whose free ends touch
 * other factions) it is emitted as a stranded open loop instead of being
 * dropped, and the algorithm advances to the next seed.
 */
export function buildFactionLoops(
  faction: string,
  sections: Array<BorderSection>,
  vertices: Array<BorderDelaunayVertex>,
) {
  // search sections for only this faction
  const filteredSections = sections.filter(
    (section) => section.affiliation1 === faction || section.affiliation2 === faction,
  );

  // Clone sections and their edges for isolation: each faction gets its own edge
  // objects so that in-place mutations (reverseEdges/swapEdgeNodes during merge
  // and orientation) don't leak to other factions' loop building. Edge clones
  // also DEEP-CLONE node objects AND all four Bezier control points
  // (n1c1/n1c2/n2c1/n2c2) so that separateBorderLoops — which mutates node
  // coordinates and control-point coordinates in-place — cannot undo one
  // faction's separation by moving the same shared node/control-point object in
  // the opposite direction for another faction. Shallow-cloned control points
  // were the root cause of visible border overlap on curves: adjacent borders'
  // control points got pulled back to the original shared border while their
  // (deep-cloned) endpoints separated, so the rendered curves converged again.
  const factionSections = filteredSections.map((s) => ({
    ...s,
    edges: s.edges.map((e) => ({
      ...e,
      node1: { ...e.node1 },
      node2: { ...e.node2 },
      ...(e.n1c1 ? { n1c1: { ...e.n1c1 } } : {}),
      ...(e.n1c2 ? { n1c2: { ...e.n1c2 } } : {}),
      ...(e.n2c1 ? { n2c1: { ...e.n2c1 } } : {}),
      ...(e.n2c2 ? { n2c2: { ...e.n2c2 } } : {}),
    })),
  }));

  logger.debug('build-faction-loops.ts', `Building loops for ${faction}: ${factionSections.length} sections`);

  const loops: Array<BorderSection> = [];

  // Endpoint index: coordinate key -> sections still pending. Keyed on a
  // rounded coordinate (see `coordKey`) rather than on node `id` so that two
  // sections meeting at the same physical point are found as candidates even
  // when their node ids differ (the divergence that previously stranded
  // borders as open loops). Storing section *references* (not array indices)
  // keeps the index valid when factionSections is spliced.
  const nodeKey = (node: VoronoiBorderNode) => coordKey(node.x, node.y);
  const endpointIndex = new Map<string, Set<BorderSection>>();
  const indexEndpoint = (section: BorderSection) => {
    for (const node of [section.node1, section.node2]) {
      const key = nodeKey(node);
      let set = endpointIndex.get(key);
      if (!set) {
        set = new Set();
        endpointIndex.set(key, set);
      }
      set.add(section);
    }
  };
  const deindexEndpoint = (section: BorderSection) => {
    for (const node of [section.node1, section.node2]) {
      const key = nodeKey(node);
      const set = endpointIndex.get(key);
      if (!set) continue;
      set.delete(section);
      if (set.size === 0) endpointIndex.delete(key);
    }
  };
  factionSections.forEach((section) => indexEndpoint(section));

  while (factionSections.length > 0) {
    const seed = factionSections[factionSections.length - 1];

    // Already a closed loop - emit and advance.
    if (seed.isLoop) {
      loops.push(seed);
      deindexEndpoint(seed);
      factionSections.splice(factionSections.indexOf(seed), 1);
      continue;
    }

    // Find a pending section (other than the seed) sharing an endpoint with
    // the seed, and merge it onto the seed. Repeat until no more merges.
    let mergedAny = false;
    let progress = true;
    while (progress) {
      progress = false;
      const candidateKeys = [nodeKey(seed.node1), nodeKey(seed.node2)];
      outer: for (const key of candidateKeys) {
        const candidates = endpointIndex.get(key);
        if (!candidates) continue;
        for (const candidate of [...candidates]) {
          if (candidate === seed) continue;
          let merged = false;

          if (sameNode(seed.node1, candidate.node1)) {
            seed.edges.unshift(...reverseEdges([...candidate.edges]));
            merged = true;
          } else if (sameNode(seed.node1, candidate.node2)) {
            seed.edges.unshift(...candidate.edges);
            merged = true;
          } else if (sameNode(seed.node2, candidate.node1)) {
            seed.edges.push(...candidate.edges);
            merged = true;
          } else if (sameNode(seed.node2, candidate.node2)) {
            seed.edges.push(...reverseEdges([...candidate.edges]));
            merged = true;
          }

          if (merged) {
            // Remove the candidate entirely (from index + working array).
            deindexEndpoint(candidate);
            factionSections.splice(factionSections.indexOf(candidate), 1);
            // Recompute seed endpoints from the merged edge list, then
            // reindex the seed under its (possibly new) node ids.
            seed.node1 = seed.edges[0].node1;
            seed.node2 = seed.edges[seed.edges.length - 1].node2;
            seed.isLoop = sameNode(seed.node1, seed.node2);
            deindexEndpoint(seed);
            indexEndpoint(seed);
            mergedAny = true;
            progress = true;
            if (seed.isLoop) {
              loops.push(seed);
              factionSections.splice(factionSections.indexOf(seed), 1);
              deindexEndpoint(seed);
              break outer;
            }
            break outer;
          }
        }
      }
    }

    if (!mergedAny) {
      // Stranded open chain: its free ends connect to no other same-faction
      // section (e.g. disconnected island or T-junction). Emit it rather than
      // dropping it, and advance so we never spin on the same seed.
      // Downgraded to debug because most cases are legitimate coastlines or
      // T-junctions with other factions, not algorithmic failures.
      logger.debug(
        'build-faction-loops.ts',
        'Disputed/stranded open border could not be closed into a loop; emitting as open loop',
        faction,
        seed.id,
      );
      loops.push(seed);
      deindexEndpoint(seed);
      factionSections.splice(factionSections.indexOf(seed), 1);
    }
  }

  // Drop duplicate edges BEFORE any geometry is derived: `length`, `minEdgeIdx`
  // and the clockwise-orientation test all read the edge list, so a duplicated
  // segment would otherwise skew the loop length and the winding pivot too.
  let duplicateEdgesRemoved = 0;
  loops.forEach((loop) => {
    const removed = dedupeLoopEdges(loop);
    if (removed > 0 && loop.edges.length > 0) {
      // Re-derive the endpoint handles from the surviving edges.
      loop.node1 = loop.edges[0].node1;
      loop.node2 = loop.edges[loop.edges.length - 1].node2;
      loop.isLoop = sameNode(loop.node1, loop.node2);
    }
    duplicateEdgesRemoved += removed;
  });
  // A loop can be emptied entirely if it consisted only of degenerate edges.
  const nonEmptyLoops = loops.filter((loop) => loop.edges.length > 0);
  loops.length = 0;
  loops.push(...nonEmptyLoops);
  if (duplicateEdgesRemoved > 0) {
    logger.debug(
      'build-faction-loops.ts',
      `Removed ${duplicateEdgesRemoved} duplicate edge(s) from ${faction} loops`,
    );
  }

// calculate loops length, left/right affiliations, orientation, and sort
  loops.forEach((loop) => {
    loop.length = loop.edges
      .map((edge) => edge.length)
      .reduce((sum, current) => sum + current, 0);

    loop.edges.forEach((edge, edgeIndex) => {
      // Mark the leftmost-bottommost edge as the loop's minimum edge (a point
      // guaranteed to be on the convex hull, usable as a CW/CCW pivot).
      if (loop.minEdgeIdx < 0 || edge.node2.x < loop.edges[loop.minEdgeIdx].node2.x) {
        loop.minEdgeIdx = edgeIndex;
      } else if (
        edge.node2.x === loop.edges[loop.minEdgeIdx].node2.x &&
        edge.node2.y < loop.edges[loop.minEdgeIdx].node2.y
      ) {
        loop.minEdgeIdx = edgeIndex;
      }
      // find the affiliation to the left and right of the current edge
      // IMPORTANT: Use BOTH vertices to determine left/right. Edges may have been
      // reversed during merging (node1/node2 swapped) but vertex1Idx/vertex2Idx
      // are NOT swapped. Testing only vertex1Idx gives wrong results for reversed edges.
      const vertex1 = vertices[edge.vertex1Idx];
      const vertex2 = vertices[edge.vertex2Idx];
      const vertex1IsLeft = pointIsLeftOfLine(vertex1, edge.node1, edge.node2);
      const vertex2IsLeft = pointIsLeftOfLine(vertex2, edge.node1, edge.node2);

      // The two Delaunay vertices must be on opposite sides of the edge
      if (vertex1IsLeft === vertex2IsLeft) {
        // Edge coordinates have been mutated by relaxBorderSection/pruneShortEdges
        // away from their original Voronoi positions, so the left/right test is
        // unreliable. Fall back to a best-guess default (aff1=left, aff2=right)
        // rather than using the degenerate result. ensureEdgeLoopClockwiseOrder
        // will correct the orientation for closed loops.
        logger.debug(
          'build-faction-loops.ts',
          'Both vertices on same side of edge - using fallback affiliation assignment',
          edge.id,
          edge.affiliation1,
          edge.affiliation2,
        );
        edge.leftAffiliation = edge.affiliation1;
        edge.rightAffiliation = edge.affiliation2;
      } else if (vertex1IsLeft) {
        // vertex1 is on left -> affiliation1 is left, affiliation2 is right
        edge.leftAffiliation = edge.affiliation1;
        edge.rightAffiliation = edge.affiliation2;
      } else {
        // vertex2 is on left -> affiliation2 is left, affiliation1 is right
        edge.leftAffiliation = edge.affiliation2;
        edge.rightAffiliation = edge.affiliation1;
      }
    });

    // Only ensure clockwise order and set inner/outer affiliation for CLOSED loops.
    // Stranded open borders (isLoop === false) have no "inside"/"outside" - they are
    // just border lines between two factions. Calling ensureEdgeLoopClockwiseOrder
    // on them incorrectly wraps the edge index and assigns bogus inner/outer
    // affiliations, which causes rendering artifacts like disputed patterns over
    // entire factions and color overlap.
    if (loop.isLoop) {
      ensureEdgeLoopClockwiseOrder(loop);
    }
  });

   // Remove redundant enclaves: a smaller closed loop of the SAME faction that sits
  // entirely inside a larger loop produces a duplicate fill (a region painted twice)
  // and the "extra loops" artifact. Keep only the outer loop.
  //
  // IMPORTANT: We compute the loop's "owner faction" from its edges' affiliations
  // (the faction on the INSIDE of the loop, i.e., the right-side affiliation for a
  // clockwise loop) rather than trusting `innerAffiliation` alone. This prevents
  // the case where a wrong `innerAffiliation` (due to orientation issues) causes
  // the wrong loop to be removed — e.g., an MoC enclave inside FWL being deleted
  // because its `innerAffiliation` was incorrectly set to FWL.
  const closedLoops = loops.filter((l) => l.isLoop);

  /**
   * Computes the owner faction of a closed loop by finding the most common
   * rightAffiliation across its edges. For a properly-oriented clockwise loop,
   * rightAffiliation is the faction on the inside (the territory owner).
   * Falls back to `innerAffiliation` if no edges have rightAffiliation set.
   */
  const computeOwnerFaction = (loop: BorderSection): string | undefined => {
    const counts = new Map<string, number>();
    for (const edge of loop.edges) {
      const aff = edge.rightAffiliation;
      if (aff && aff !== '') {
        counts.set(aff, (counts.get(aff) ?? 0) + 1);
      }
    }
    if (counts.size === 0) return loop.innerAffiliation;
    let best = '';
    let bestCount = 0;
    for (const [aff, count] of counts) {
      if (count > bestCount) {
        best = aff;
        bestCount = count;
      }
    }
    return best || loop.innerAffiliation;
  };

  const isEnclave = (inner: BorderSection, outer: BorderSection): boolean => {
    if (inner === outer) return false;
    // Compare OWNER faction (computed from edge affiliations), not innerAffiliation,
    // because innerAffiliation may be wrong if the loop orientation was mis-detected.
    const innerOwner = computeOwnerFaction(inner);
    const outerOwner = computeOwnerFaction(outer);
    if (innerOwner !== outerOwner) return false;
    if ((inner.length ?? 0) >= (outer.length ?? 0)) return false;
    // Test the centroid of the inner loop against the outer polygon.
    const cx = inner.edges.reduce((s, e) => s + e.node1.x, 0) / inner.edges.length;
    const cy = inner.edges.reduce((s, e) => s + e.node1.y, 0) / inner.edges.length;
    return polygonContains(outer, { x: cx, y: cy });
  };
  const keptLoops = loops.filter((loop) => {
    if (!loop.isLoop) return true;
    const enclosed = closedLoops.some(
      (other) => isEnclave(loop, other) && !isEnclave(other, loop),
    );
    if (enclosed) {
      logger.debug('build-faction-loops.ts', 'Removing redundant enclave loop', loop.id, loop.innerAffiliation);
    }
    return !enclosed;
  });

  keptLoops.sort((a, b) => (b.length ?? 0) - (a.length ?? 0));
  return keptLoops;
}

/**
 * Ray-casting point-in-polygon test. The loop is treated as a closed polygon
 * over its edge endpoints (node1 of each edge). Works for either winding order.
 */
function polygonContains(loop: BorderSection, point: { x: number; y: number }): boolean {
  const pts = loop.edges.map((e) => e.node1);
  if (pts.length < 3) return false;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;
    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
