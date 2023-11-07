import { VoronoiBorderEdge } from '../../types';

/**
 * Swaps the given edge's nodes, in-place.
 *
 * @param edge The edge
 */
export function swapEdgeNodes(edge: VoronoiBorderEdge) {
  // nodes
  const tmpNode = edge.node1;
  edge.node1 = edge.node2;
  edge.node2 = tmpNode;
  // control points
  let tmpC = edge.n1c1;
  edge.n1c1 = edge.n2c2;
  edge.n2c2 = tmpC;
  tmpC = edge.n1c2;
  edge.n1c2 = edge.n2c1;
  edge.n2c1 = tmpC;
  // left / right affiliations
  const tmpAffiliation = edge.leftAffiliation;
  edge.leftAffiliation = edge.rightAffiliation;
  edge.rightAffiliation = tmpAffiliation;
}
