import { VoronoiBorderEdge, BorderSection, VoronoiBorderNode } from '../types';
import { distance, nearestPointOnLineSegment, Point2d } from '../../../common';
import { PointWithAffiliation } from '../../types';

/**
 * A salient as understood here is a thin stretch of territory ranging into
 * another territory, connecting the faction's main area to relatively close
 * "islands" also belonging to that faction.
 *
 * Since we are trying to do this as early as possible in the overall border
 * generation process, we'll have to work with simple border loops here, comparing
 * their affiliations and finding close nodes.
 *
 * The general idea of the algorithm is as follows:
 * - Consider the different loops / "islands" for a given faction
 * - Attempt to find a close (<= 40LY) loop for that same faction
 * - To connect the two sections, draw a "tunnel" of edges and ensure it does not collide with any systems with a
 *    different affiliation
 */
export function connectSalients(loops: Record<string, Array<BorderSection>>) {
  const mergePoints: Array<PointWithAffiliation> = [];

  for (let faction in loops) {
    // run the salient logic for each loop that is not the largest for that faction
    for (let i = 1; i < loops[faction].length; i++) {
      const closestEdges = findCloseSectionEdges(loops[faction][i], loops[faction]);
      if (closestEdges.length > 0) {
        mergePoints.push({
          x: 0.5 * (closestEdges[0].closestIslandNode.x + closestEdges[0].closestSectionPoint.x),
          y: 0.5 * (closestEdges[0].closestIslandNode.y + closestEdges[0].closestSectionPoint.y),
          affiliation: faction,
        });
      }
    }
  }
  return mergePoints;
}

function findCloseSectionEdges(island: BorderSection, sections: Array<BorderSection>) {
  const MAX_DISTANCE = 27.5;
  const closestEdges: Array<{
    section: BorderSection,
    edge: VoronoiBorderEdge,
    distToIsland: number,
    closestIslandNode: VoronoiBorderNode,
    closestSectionPoint: Point2d,
    collisionCandidates: Array<number>,
  }> = [];
  const islandNodes = island.edges.map((edge) => edge.node1);
  sections.forEach((section) => {
    // the looked at section is not interesting to us if it's the island itself
    if (section.id === island.id) {
      return;
    }

    // look at all the section's edges to find one that is close enough to the island
    section.edges.forEach((edge) => {
      let distToIsland = Infinity;
      let closestIslandNode: VoronoiBorderNode = island.edges[0].node1;
      let closestSectionPoint: Point2d | null = null;
      islandNodes.forEach((islandNode) => {
        const nearestPointOnEdge = nearestPointOnLineSegment(edge.node1, edge.node2, islandNode, true);
        const dist = distance(nearestPointOnEdge as Point2d, islandNode);
        if (dist < distToIsland) {
          distToIsland = dist;
          closestIslandNode = islandNode;
          closestSectionPoint = nearestPointOnEdge;
        }
      });
      if (distToIsland <= MAX_DISTANCE) {
        closestEdges.push({
          section,
          edge,
          distToIsland,
          closestIslandNode,
          closestSectionPoint: closestSectionPoint as unknown as Point2d,
          collisionCandidates: [
            edge.node1.vertex1Idx,
            edge.node1.vertex2Idx,
            edge.node1.vertex3Idx,
            edge.node2.vertex1Idx,
            edge.node2.vertex2Idx,
            edge.node2.vertex3Idx,
            closestIslandNode.vertex1Idx,
            closestIslandNode.vertex2Idx,
            closestIslandNode.vertex3Idx,
          ].sort((a, b) => a - b)
            .filter((element, i, arr) => i === 0 || element !== arr[i - 1]),
        });
      }
    });
  });

  closestEdges.sort((a, b) => a.distToIsland - b.distToIsland);
  return closestEdges.slice(0, 3);
}
