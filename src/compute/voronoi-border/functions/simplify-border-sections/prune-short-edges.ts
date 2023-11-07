import { BorderSection, BorderDelaunayVertex } from '../../types';
import { updateEdgeValues } from '../utils';

/**
 * Simplifies border section by replacing very short edges with direct connections
 * if possible.
 *
 * @param section The border section to prune (will be modified)
 * @param vertices The full list of delaunay vertices (required for position reference)
 * @param threeWayNodes An object mapping node IDs of voronoi nodes with 3 or more adjacent affiliations
 *  to their adjacent edge IDs (will be modified during pruning)
 * @param threshold Maximum length of an edge that will be removed
 */
export function pruneShortEdges(
  section: BorderSection,
  vertices: Array<BorderDelaunayVertex>,
  threeWayNodes: Record<string, Array<string>>,
  threshold = 5
) {
  let numberOfEdgesRemoved = 0;
  for (let i = 0; i < section.edges.length; i++) {
    const length = section.edges[i].length;
    const lengthFactor = 0.2;
    if (length > threshold || section.edges.length < 2) {
      continue;
    }
    const numOfBorderAffiliations1 = Object.keys(section.edges[i].node1.borderAffiliations).length;
    const numOfBorderAffiliations2 = Object.keys(section.edges[i].node2.borderAffiliations).length;
    if (
      i > 0 &&
      i < section.edges.length - 1 &&
      section.edges[i - 1].closeness > section.edges[i - 1].length * lengthFactor &&
      section.edges[i].closeness > section.edges[i].length * lengthFactor &&
      // Math.min(section.edges[i - 1].closeness, section.edges[i + 1].closeness) > lengthFactor &&
      Math.max(numOfBorderAffiliations1, numOfBorderAffiliations2) <= 2
    ) {
      // before removing the edge, create a new connecting node at the edge's midpoint
      const newNode = {...section.edges[i].node1};
      newNode.x = 0.5 * (section.edges[i].node1.x + section.edges[i].node2.x);
      newNode.y = 0.5 * (section.edges[i].node1.y + section.edges[i].node2.y);
      newNode.borderAffiliations = {
        ...section.edges[i].node1.borderAffiliations,
        ...section.edges[i].node2.borderAffiliations,
      };
      section.edges[i - 1].node2 = newNode;
      section.edges[i + 1].node1 = newNode;
      updateEdgeValues(section.edges[i - 1], vertices);
      updateEdgeValues(section.edges[i + 1], vertices);
      const oldNode1Id = section.edges[i].node1.id;
      const oldNode2Id = section.edges[i].node2.id;
      if (threeWayNodes[oldNode1Id]) {
        threeWayNodes[oldNode1Id] = threeWayNodes[oldNode1Id].filter((edgeId) => edgeId !== section.edges[i].id);
        threeWayNodes[oldNode1Id].push(section.edges[i + 1].id);
      }
      if (threeWayNodes[oldNode2Id]) {
        threeWayNodes[oldNode2Id] = threeWayNodes[oldNode2Id].filter((edgeId) => edgeId !== section.edges[i].id);
        threeWayNodes[oldNode2Id].push(section.edges[i - 1].id);
      }
      section.edges.splice(i, 1);
      numberOfEdgesRemoved++;
      i--;
    } else if (
      numOfBorderAffiliations2 <= 2 && (
        (i === 0 && section.edges[1].closeness > length) ||
        (
          i > 0 &&
          i < section.edges.length - 1 &&
          section.edges[i + 1].closeness > section.edges[i + 1].length * lengthFactor
        )
      )
    ) {
      // instead of taking the mid point, use node1 of the removed edge, essentially
      // removing node2 completely

      // update the three way nodes list for node1 first
      const node1Id = section.edges[i].node1.id
      if (threeWayNodes[node1Id]) {
        threeWayNodes[node1Id] = threeWayNodes[node1Id].filter((edgeId) => edgeId !== section.edges[i].id);
        threeWayNodes[node1Id].push(section.edges[i + 1].id);
      }
      // re-wire nodes and remove edge
      section.edges[i+1].node1 = section.edges[i].node1;
      updateEdgeValues(section.edges[i + 1], vertices);
      section.edges.splice(i, 1);
      numberOfEdgesRemoved++;
      i--;
    } else if (
      numOfBorderAffiliations1 <= 2 && (
        (
          i === section.edges.length - 1 &&
          section.edges[i - 1].closeness > length
        ) ||
        (
          i > 0 &&
          i < section.edges.length - 1 &&
          section.edges[i - 1].closeness > section.edges[i - 1].length * lengthFactor
        )
      )
    ) {
      // instead of taking the mid point, use node2 of the removed edge, essentially
      // removing node1 completely

      // update the three way nodes list for node1 first
      const node2Id = section.edges[i].node2.id
      if (threeWayNodes[node2Id]) {
        threeWayNodes[node2Id] = threeWayNodes[node2Id].filter((edgeId) => edgeId !== section.edges[i].id);
        threeWayNodes[node2Id].push(section.edges[i - 1].id);
      }
      // re-wire nodes and remove edge
      section.edges[i - 1].node2 = section.edges[i].node2;
      updateEdgeValues(section.edges[i - 1], vertices);
      section.edges.splice(i, 1);
      numberOfEdgesRemoved++;
      i--;
    }
  }
  return numberOfEdgesRemoved;
}
