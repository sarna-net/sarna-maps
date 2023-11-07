import { BorderEdgeLoop } from '../types';
import { crossProduct } from '../../../common';
import { reverseEdgeLoop } from './utils';

/**
 * Ensures that the given loop has its linked list of edges ordered in a clockwise fashion.
 * Once a loop is guaranteed to be clockwise, its inner affiliation can be determined by looking
 * at any edge's right side vertex.
 *
 * Modifies the provided edge loop in-place.
 *
 * @param edgeLoop
 */
export function ensureEdgeLoopClockwiseOrder(edgeLoop: BorderEdgeLoop) {
  const minEdge = edgeLoop.edges[edgeLoop.minEdgeIdx];
  const nextEdge = edgeLoop.edges[(edgeLoop.minEdgeIdx + 1) % edgeLoop.edges.length];
  const node1 = minEdge.node1;
  const node2 = minEdge.node2;
  const node3 = nextEdge.node2;
  const crossP = crossProduct(
    { a: node1.x - node2.x, b: node1.y - node2.y },
    { a: node3.x - node2.x, b: node3.y - node2.y }
  );
  if(crossP < 0) {
    // loop's order is counter-clockwise
    // reverse loop's edges to make their order clockwise
    reverseEdgeLoop(edgeLoop);
  }
  // set loop object's inner affiliation information
  edgeLoop.innerAffiliation = edgeLoop.edges[0].rightAffiliation;
  edgeLoop.outerAffiliation = edgeLoop.edges[0].leftAffiliation;
}
