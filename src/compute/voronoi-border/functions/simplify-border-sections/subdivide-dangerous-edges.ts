import { BorderSection, BorderDelaunayVertex, VoronoiBorderEdge, VoronoiBorderNode } from '../../types';
import { updateEdgeValues } from '../utils';

export function subdivideDangerousEdges(
  section: BorderSection,
  vertices: Array<BorderDelaunayVertex>,
  threeWayNodes: Record<string, Array<string>>,
  closenessFactor = 10,
) {
  let numberOfNewEdges = 0;
  for (let edgeIndex = 0; edgeIndex < section.edges.length; edgeIndex++) {
    const edge = section.edges[edgeIndex];
    if (edge.length > edge.closeness * closenessFactor) {
      const newNode: VoronoiBorderNode = {
        ...edge.node1,
        id: edge.node1.id + 'b',
        x: 0.5 * (edge.node1.x + edge.node2.x),
        y: 0.5 * (edge.node1.y + edge.node2.y),
        neighborNodeIndices: [
          parseInt(edge.node1.id, 10),
          parseInt(edge.node2.id, 10)
        ],
      };
      const newEdge: VoronoiBorderEdge = {
        ...edge,
        id: edge.id.replace(edge.node1.id, newNode.id),
        node1: newNode,
        node2: edge.node2,
      }
      edge.node2 = newNode;
      updateEdgeValues(edge, vertices);
      updateEdgeValues(newEdge, vertices);
      section.edges.splice(edgeIndex + 1, 0, newEdge);
      if ((threeWayNodes[newEdge.node2.id] || []).includes(edge.id)) {
        threeWayNodes[newEdge.node2.id] = threeWayNodes[newEdge.node2.id].filter((edgeId) => edgeId !== edge.id);
        threeWayNodes[newEdge.node2.id].push(newEdge.id);
      }
      numberOfNewEdges++;
    }
  }
  return numberOfNewEdges;
}
