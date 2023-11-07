import { BorderSection, BorderDelaunayVertex } from '../../types';
import { distance, nearestPointOnLineSegment, scaleVector } from '../../../../common';
import { updateEdgeValues } from '../utils';

/**
 * Relax border section by reducing "spikes". The general algorithm is to look at
 * two neighboring edges (3 nodes) and tease the center node towards the connecting
 * line, if space allows.
 *
 * @param section The border section to relax (will be modified)
 * @param vertices The full list of delaunay vertices (required for position reference)
 * @param tension The factor to pull the node by (higher number = more pull)
 * @param minCloseness The minimum closeness that still allows nodes to be moved
 */
export function relaxBorderSection(
  section: BorderSection,
  vertices: Array<BorderDelaunayVertex>,
  tension = 0.5,
  minCloseness = 7.5
) {
  for (let i = 0; i < section.edges.length - 2; i++) {
    const edge1 = section.edges[i];
    const edge2 = section.edges[i + 1];
    // if node in question is a three way node (border between 3 or more factions), do not move it
    if (Object.keys(edge1.node2.borderAffiliations).length > 2) {
      continue;
    }
    const startPoint = edge1.node1;
    const midPoint = edge1.node2;
    const endPoint = edge2.node2;
    const pullPoint = nearestPointOnLineSegment(startPoint, endPoint, midPoint) || midPoint;
    const distanceToPullPoint = distance(midPoint, pullPoint);
    let closenessFactor = Math.min(edge1.closeness, edge2.closeness);
    if (closenessFactor < minCloseness) {
      closenessFactor = 0;
    }
    const moveDistance = Math.min(tension * closenessFactor, distanceToPullPoint);
    if (moveDistance > 0) {
      const moveVector = { a: pullPoint.x - midPoint.x, b: pullPoint.y - midPoint.y };
      scaleVector(moveVector, moveDistance);
      const newX = edge1.node2.x + moveVector.a;
      const newY = edge1.node2.y + moveVector.b;
      edge1.node2.x = newX;
      edge1.node2.y = newY;
      edge2.node1.x = newX;
      edge2.node1.y = newY;
      updateEdgeValues(edge1, vertices);
      updateEdgeValues(edge2, vertices);
    }
  }

  return section;
}
