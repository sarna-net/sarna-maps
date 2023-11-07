import { VoronoiBorderEdge } from '../../types';
import { swapEdgeNodes } from './swap-edge-nodes';

/**
 * Reverses an edge array in-place.
 * @param edges The edge array to reverse
 */
export function reverseEdges(edges: Array<VoronoiBorderEdge>) {
  edges.reverse();
  for (let edgeIdx = 0; edgeIdx < edges.length; edgeIdx++) {
    swapEdgeNodes(edges[edgeIdx]);
  }
  return edges;
}
