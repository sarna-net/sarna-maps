import { BorderSection, BorderDelaunayVertex } from '../../types';
import { distance, distancePointToLine, lineFromPoints } from '../../../../common';
import { updateEdgeValues } from '../utils';

/**
 * Simplifies a border section by merging neighboring edges if they form a straight (or almost straight) line.
 *
 * @param section The border section to simplify (will be modified)
 * @param vertices The full list of delaunay vertices (required for position reference)
 * @param threeWayNodes An object mapping node IDs of voronoi nodes with 3 or more adjacent affiliations
 *  to their adjacent edge IDs (will be modified during pruning)
 * @param minCloseness Minimum closeness value of two edges for a merge to happen
 * @param minClosenessRelation
 * @param alwaysMergeDistance Distance below which the edges will always be merged (unless closeness < minCloseness)
 * @param maxDistanceFactor Maximum distance factor between the edges' mid point and the connecting line. The higher
 *  this value is set, the more edges will be merged.
 */
export function mergeStraightEdges(
  section: BorderSection,
  vertices: Array<BorderDelaunayVertex>,
  threeWayNodes: Record<string, Array<string>>,
  minCloseness = 4.2,
  minClosenessRelation = 0.075, //0.11,
  alwaysMergeDistance = 3,
  maxDistanceFactor = 0.05,
) {
  // max distance factor: longer edges can be merged more easily
  let numberOfRemovedEdges = 0;
  for (let i = 0; i < section.edges.length - 1; i++) {
    const node1 = section.edges[i].node1;
    const node2 = section.edges[i].node2;
    const node3 = section.edges[i + 1].node2;

    const closeness = Math.min(section.edges[i].closeness, section.edges[i + 1].closeness);
    const closenessRelation1 = section.edges[i].closeness / section.edges[i].length;
    const closenessRelation2 = section.edges[i + 1].closeness / section.edges[i + 1].length;
    const dist = distancePointToLine(node2, lineFromPoints(node1, node3));
    const length = distance(node1, node3);
    if (length > 500 || Object.keys(node2.borderAffiliations).length > 2) {
      // filter(
      // (aff) => ![EMPTY_FACTION].includes(aff)).length > 2) {
      continue;
    }
    if (
      closeness > minCloseness &&
      Math.min(closenessRelation1, closenessRelation2) > minClosenessRelation &&
      (dist < alwaysMergeDistance || dist / length < maxDistanceFactor)
    ) {
      section.edges[i].node2 = section.edges[i + 1].node2;
      const node2Id = section.edges[i].node2.id;
      // modify three way nodes list
      if (threeWayNodes[node2Id]) {
        threeWayNodes[node2Id] = threeWayNodes[node2Id].filter((edgeId) => edgeId !== section.edges[i + 1].id);
        threeWayNodes[node2Id].push(section.edges[i].id);
      }
      updateEdgeValues(section.edges[i], vertices);
      section.edges.splice(i + 1, 1);
      i--;
      numberOfRemovedEdges++;
    }
  }
  return numberOfRemovedEdges;
}
