import { VoronoiBorderEdge, BorderDelaunayVertex } from '../../types';
import { distance, distancePointToLine, lineFromPoints } from '../../../../common';

/**
 * Updates a border edge's length and closeness, e.g. after its node positions
 * have changed.
 * @param edge The border edge
 * @param vertices The full list of delaunay vertices (required for position reference)
 */
export function updateEdgeValues(edge: VoronoiBorderEdge, vertices: Array<BorderDelaunayVertex>) {
  const vertex1 = vertices[edge.vertex1Idx];
  const vertex2 = vertices[edge.vertex2Idx];
  const line = lineFromPoints(edge.node1, edge.node2);
  edge.length = distance(edge.node1, edge.node2);
  edge.closeness = !vertex1 || !vertex2
    ? 0
    : Math.min(
      distancePointToLine(vertex1, line),
      distancePointToLine(vertex2, line),
    );
}
