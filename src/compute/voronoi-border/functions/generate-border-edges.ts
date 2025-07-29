import { VoronoiBorderEdge, BorderDelaunayVertex, VoronoiBorderNode } from '../types';
import { distance, distancePointToLine, lineFromPoints } from '../../../common';
import { EMPTY_FACTION, INDEPENDENT } from '../../constants';

export function generateBorderEdges(voronoiNodes: VoronoiBorderNode[], vertices: BorderDelaunayVertex[]) {
  const borderNodeIndices: Record<string, Array<number>> = {};
  const borderEdges: Record<string, Array<VoronoiBorderEdge>> = {};
  const threeWayNodes: Record<string, Array<string>> = {};

  for(let nodeIdx = 0, triIdx = 0; nodeIdx < voronoiNodes.length; nodeIdx++, triIdx += 3) {
    const voronoiNode = voronoiNodes[nodeIdx];

    // Iterate over the current node's vertices and mark the node as a border node
    // if not all vertices have the same affiliation.
    // Also remember all adjacent affiliations for each node.
    const vertex1 = vertices[voronoiNode.vertex1Idx];
    const vertex2 = vertices[voronoiNode.vertex2Idx];
    const vertex3 = vertices[voronoiNode.vertex3Idx];
    if (!borderNodeIndices[vertex1.affiliation]) { borderNodeIndices[vertex1.affiliation] = [] }
    if (!borderNodeIndices[vertex2.affiliation]) { borderNodeIndices[vertex2.affiliation] = [] }
    if (!borderNodeIndices[vertex3.affiliation]) { borderNodeIndices[vertex3.affiliation] = [] }

    // case 1: all objects share the same affiliation (no border)
    if(vertex1.affiliation === vertex2.affiliation && vertex2.affiliation === vertex3.affiliation) {
      // do nothing
      // case 2: vertex 1 and 2 share affiliation, vertex 3 has different affiliation
    } else if (vertex1.affiliation === vertex2.affiliation && vertex1.affiliation !== vertex3.affiliation) {
      (borderNodeIndices[vertex1.affiliation] as Array<number>).push(nodeIdx);
      voronoiNode.borderAffiliations[vertex1.affiliation] = true;
      (borderNodeIndices[vertex3.affiliation] as Array<number>).push(nodeIdx);
      voronoiNode.borderAffiliations[vertex3.affiliation] = true;
      // case 3: vertex 1 and 3 share affiliation, vertex 2 has different affiliation
    } else if (vertex1.affiliation === vertex3.affiliation && vertex1.affiliation !== vertex2.affiliation) {
      (borderNodeIndices[vertex1.affiliation] as Array<number>).push(nodeIdx);
      voronoiNode.borderAffiliations[vertex1.affiliation] = true;
      (borderNodeIndices[vertex2.affiliation] as Array<number>).push(nodeIdx);
      voronoiNode.borderAffiliations[vertex2.affiliation] = true;
      // case 4: vertex 2 and 3 share affiliation, vertex 1 has different affiliation
    } else if (vertex2.affiliation === vertex3.affiliation && vertex1.affiliation !== vertex2.affiliation) {
      (borderNodeIndices[vertex1.affiliation] as Array<number>).push(nodeIdx);
      voronoiNode.borderAffiliations[vertex1.affiliation] = true;
      (borderNodeIndices[vertex2.affiliation] as Array<number>).push(nodeIdx);
      voronoiNode.borderAffiliations[vertex2.affiliation] = true;
      // case 5: each vertex has a different affiliation
    } else {
      (borderNodeIndices[vertex1.affiliation] as Array<number>).push(nodeIdx);
      voronoiNode.borderAffiliations[vertex1.affiliation] = true;
      (borderNodeIndices[vertex2.affiliation] as Array<number>).push(nodeIdx);
      voronoiNode.borderAffiliations[vertex2.affiliation] = true;
      (borderNodeIndices[vertex3.affiliation] as Array<number>).push(nodeIdx);
      voronoiNode.borderAffiliations[vertex3.affiliation] = true;
    }

    // Finally, create a border edge between this node and each of its differently-affiliated neighbors
    voronoiNode.neighborNodeIndices.forEach((neighborIdx) => {
      // in order to make sure we add edges to the list only once, skip all neighbors that
      // have already been searched themselves
      if (nodeIdx >= neighborIdx) {
        return;
      }

      const neighborNode = voronoiNodes[neighborIdx];
      // find the vertices shared by the node and its neighbor
      const nodeVertexIndices = [
        voronoiNode.vertex1Idx, voronoiNode.vertex2Idx, voronoiNode.vertex3Idx
      ];
      const neighborVertexIndices = [
        neighborNode.vertex1Idx, neighborNode.vertex2Idx, neighborNode.vertex3Idx
      ];
      const sharedVertexIndices = nodeVertexIndices.filter((idx) => neighborVertexIndices.includes(idx));
      if (sharedVertexIndices.length >= 2) {
        const affiliation1 = vertices[sharedVertexIndices[0]].affiliation;
        const affiliation2 = vertices[sharedVertexIndices[1]].affiliation;
        // do not create border edges between independent and empty areas
        if (
          [EMPTY_FACTION, INDEPENDENT].includes(affiliation1) &&
          [EMPTY_FACTION, INDEPENDENT].includes(affiliation2)
        ) {
          return;
        }

        if (affiliation1 !== affiliation2) {
          const edgeLine = lineFromPoints(voronoiNode, neighborNode);
          const closeness = Math.min(
            distancePointToLine(vertices[sharedVertexIndices[0]], edgeLine),
            distancePointToLine(vertices[sharedVertexIndices[1]], edgeLine),
          );

          const edgeId = [nodeIdx, neighborIdx].sort((a, b) => a - b).join('-');
          if (Object.keys(voronoiNode.borderAffiliations).length > 2) {
            threeWayNodes[voronoiNode.id] = threeWayNodes[voronoiNode.id] || [];
            threeWayNodes[voronoiNode.id].push(edgeId);
          }
          if (Object.keys(neighborNode.borderAffiliations).length > 2) {
            threeWayNodes[neighborNode.id] = threeWayNodes[neighborNode.id] || [];
            threeWayNodes[neighborNode.id].push(edgeId);
          }

          const borderEdge = {
            id: edgeId,
            node1: voronoiNode,
            node2: neighborNode,
            vertex1Idx: sharedVertexIndices[0],
            vertex2Idx: sharedVertexIndices[1],
            affiliation1,
            affiliation2,
            leftAffiliation: '', // will be calculated later
            rightAffiliation: '', // will be calculated later
            length: distance(voronoiNode, neighborNode),
            closeness,
          };
          const combinedAffiliation = [affiliation1, affiliation2].sort().join('___');
          if (!borderEdges[combinedAffiliation]) { borderEdges[combinedAffiliation] = [] }
          (borderEdges[combinedAffiliation] as VoronoiBorderEdge[]).push(borderEdge);
        }
      }
    });
  }
  return { borderEdges, threeWayNodes };
}
