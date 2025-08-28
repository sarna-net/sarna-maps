import { VoronoiBorderEdge, BorderSection, VoronoiBorderNode, BorderDelaunayVertex } from '../types';
import { DelaunayVertex, distance, nearestPointOnLineSegment, Point2d, pointOnLine } from '../../../common';
import { SalientPoint } from '../../types';
import { EMPTY_FACTION } from '../../constants';

// TODO put these values in a config file
// The distance of the merge points along a salient path
const MERGE_POINT_STEP = 2;
// The maximum distance for salients to be drawn
const MAX_DISTANCE = 27.5;

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
export function connectSalients(loops: Record<string, Array<BorderSection>>, vertices: Array<BorderDelaunayVertex>) {
  const mergePoints: Array<SalientPoint> = [];

  for (let faction in loops) {
    // run the salient logic for each loop that is not the largest for that faction
    for (let i = 1; i < loops[faction].length; i++) {
      if (loops[faction][i].innerAffiliation !== EMPTY_FACTION && loops[faction][i].innerAffiliation !== faction) {
        // skip any islands for different factions - they will be handled by that faction's logic
        continue;
      }
      const closestEdges = findCloseSectionEdges(loops[faction][i], loops[faction]);
      if (closestEdges.length > 0) {
        // find the full affiliation for the salient
        const fullAffiliation = [
          vertices[closestEdges[0].closestIslandNode.vertex1Idx].affiliation,
          vertices[closestEdges[0].closestIslandNode.vertex2Idx].affiliation,
          vertices[closestEdges[0].closestIslandNode.vertex3Idx].affiliation,
        ].find((affiliation) => (affiliation === faction) || affiliation.startsWith(faction));
        // generate merge points for the salient
        const salientDistance = distance(closestEdges[0].closestIslandNode, closestEdges[0].closestSectionPoint);
        if (salientDistance < MERGE_POINT_STEP) {
          mergePoints.push({
            id: `salient-merge-point-${faction}-${i}-0-min`,
            affiliation: fullAffiliation || faction,
            info: `closest edge 0 from loop ${i} with faction ${faction} and fullAffiliation ${fullAffiliation}`,
            ...pointOnLine(closestEdges[0].closestIslandNode, closestEdges[0].closestSectionPoint, salientDistance * 0.5),
          });
        }
        for (let mergePointDistance = MERGE_POINT_STEP; mergePointDistance < salientDistance; mergePointDistance += MERGE_POINT_STEP) {
          mergePoints.push({
            id: `salient-merge-point-${faction}-${i}-0-${mergePointDistance}`,
            affiliation: fullAffiliation || faction,
            info: `closest edge 0 from loop ${i} with faction ${faction} and fullAffiliation ${fullAffiliation}`,
            ...pointOnLine(closestEdges[0].closestIslandNode, closestEdges[0].closestSectionPoint, mergePointDistance),
          });
        }
      }
    }
  }
  return mergePoints;
}

function findCloseSectionEdges(island: BorderSection, sections: Array<BorderSection>) {
  const closestEdges: Array<{
    section: BorderSection,
    edge: VoronoiBorderEdge,
    distToIsland: number,
    closestIslandNode: VoronoiBorderNode,
    closestSectionPoint: Point2d,
    collisionCandidates: Array<number>,
  }> = [];
  const islandNodes = island.edges.map((edge) => edge.node1);
  sections.forEach((section, sectionIndex) => {
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
