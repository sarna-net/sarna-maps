import { Logger } from '../utils';
import { triangleCircumcenter } from '../math-2d';
import { DelaunayVertex, VoronoiCellMode, VoronoiNode } from './types';
import Delaunator from 'delaunator';

/**
 * Iterates over the triangles and generates a voronoi node for each one.
 *
 * Note that the delaunator result's triangles property is a flat array of vertex indices,
 * organized in groups of threes.
 *
 * @param delaunay The delaunay triangulation result
 * @param vertices The list of delaunay vertices. Will be modified.
 * @param cellMode The cell mode to use
 * @returns The list of generated voronoi nodes
 */
export function generateVoronoiNodes<T extends DelaunayVertex>(
  delaunay: Delaunator<[number, number]>,
  vertices: Array<T>,
  cellMode: VoronoiCellMode = VoronoiCellMode.Circumcenters,
) {
  const voronoiNodes: Array<VoronoiNode> = [];
  // When reading this function, keep in mind that there are exactly as many voronoi nodes as
  // there are delaunay triangles, which means that the voronoi node with index i corresponds
  // to the triangle with index i*3.
  for (let vertexIdx = 0; vertexIdx < delaunay.triangles.length; vertexIdx += 3) {
    const voronoiNode = {
      id: `${vertexIdx / 3}`,
      x: Infinity, // initialize with infinity, will be corrected later
      y: Infinity, // initialize with infinity, will be corrected later
      vertex1Idx: delaunay.triangles[vertexIdx],
      vertex2Idx: delaunay.triangles[vertexIdx+1],
      vertex3Idx: delaunay.triangles[vertexIdx+2],
      neighborNodeIndices: [],
    };

    // vertex objects (a system or noise point)
    const vertex1 = vertices[voronoiNode.vertex1Idx];
    const vertex2 = vertices[voronoiNode.vertex2Idx];
    const vertex3 = vertices[voronoiNode.vertex3Idx];
    vertex1.adjacentTriIndices.push(vertexIdx);
    vertex2.adjacentTriIndices.push(vertexIdx);
    vertex3.adjacentTriIndices.push(vertexIdx);

    // calculate voronoi node coordinates, using the vertex object's positions
    if (cellMode === VoronoiCellMode.Circumcenters) {
      const ccenter = triangleCircumcenter(vertex1, vertex2, vertex3);
      if(!ccenter) {
        Logger.warn(`Cannot calculate circumcenter for voronoi node. ` +
          `Using centroid instead. Vertices:`,
          vertex1, vertex2, vertex3);
      } else {
        voronoiNode.x = ccenter.x;
        voronoiNode.y = ccenter.y;
      }
    }
    if (cellMode === VoronoiCellMode.Centroids || voronoiNode.x === Infinity) {
      voronoiNode.x = (vertex1.x + vertex2.x + vertex3.x) / 3;
      voronoiNode.y = (vertex1.y + vertex2.y + vertex3.y) / 3;
    }
    voronoiNodes.push(voronoiNode);
  }

  // run over the nodes again. The adjacentTriIndices array should now be populated
  for (let vertexIdx = 0; vertexIdx < delaunay.triangles.length; vertexIdx += 3) {
    const voronoiNode = voronoiNodes[vertexIdx / 3];

    // vertex objects (a system or noise point)
    const vertex1 = vertices[voronoiNode.vertex1Idx];
    const vertex2 = vertices[voronoiNode.vertex2Idx];
    const vertex3 = vertices[voronoiNode.vertex3Idx];

    // A-B and A-C edges:
    vertex1.adjacentTriIndices.forEach((vert1AdjTriIndex: number) => {
      // trivially, the current triangle is not its own neighbor
      if(vert1AdjTriIndex === vertexIdx) { return }
      vertex2.adjacentTriIndices.forEach((vert2AdjTriIndex: number) => {
        if(vert1AdjTriIndex === vert2AdjTriIndex) {
          voronoiNode.neighborNodeIndices.push(vert1AdjTriIndex / 3);
        }
      });
      vertex3.adjacentTriIndices.forEach((vert3AdjTriIndex: number) => {
        if(vert1AdjTriIndex === vert3AdjTriIndex) {
          voronoiNode.neighborNodeIndices.push(vert1AdjTriIndex / 3);
        }
      });
    });
    // B-C edges
    vertex2.adjacentTriIndices.forEach((vert2AdjTriIndex: number) => {
      if(vert2AdjTriIndex === vertexIdx) { return }
      vertex3.adjacentTriIndices.forEach((vert3AdjTriIndex: number) => {
        if(vert2AdjTriIndex === vert3AdjTriIndex) {
          voronoiNode.neighborNodeIndices.push(vert2AdjTriIndex / 3);
        }
      });
    });
  }

  return voronoiNodes;
}
