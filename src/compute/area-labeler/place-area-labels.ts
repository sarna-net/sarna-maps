import { BorderEdgeLoop } from '../voronoi-border';
import { DelaunayVertex, dynamicImport, generateVoronoiNodes, Point2d, VoronoiCellMode, VoronoiNode } from '../../common';
import { generateEvenlyDistributedPointsAlongEdgeLoop } from './generate-evenly-distributed-points-along-edge-loop';

export async function placeAreaLabels(borderLoops: Record<string, Array<BorderEdgeLoop>>) {
  const Delaunator = (await dynamicImport('delaunator')).default;

  let delaunayVertices: Array<DelaunayVertex> = [];
  const delaunayTriangles: Array<{ p1: Point2d, p2: Point2d, p3: Point2d }> = [];
  let voronoiNodes: Array<VoronoiNode> = [];

  Object.keys(borderLoops).forEach((faction) => {
    if (faction === 'LC') {
      delaunayVertices = generateEvenlyDistributedPointsAlongEdgeLoop(borderLoops[faction][0])
        .map((point) => ({ ...point, adjacentTriIndices: [] }));
      // borderLoops[faction].forEach((loop) => {
      //   loop.edges.forEach((edge) => {
      //     delaunayVertices.push({ x: edge.node1.x, y: edge.node1.y, adjacentTriIndices: [] });
      //   });
      // });

      const delaunay = Delaunator.from(delaunayVertices.map((vertex) => [vertex.x, vertex.y]));
      for (let i = 0; i < delaunay.triangles.length; i += 3) {
        delaunayTriangles.push({
          p1: delaunayVertices[delaunay.triangles[i]],
          p2: delaunayVertices[delaunay.triangles[i + 1]],
          p3: delaunayVertices[delaunay.triangles[i + 2]],
        });
      }
      voronoiNodes = generateVoronoiNodes(delaunay, delaunayVertices, VoronoiCellMode.Centroids);

      // const delaunayTriangles: Array<[DelaunayVertex, DelaunayVertex, DelaunayVertex]> = [];
      // for (let i = 0; i < delaunay.triangles.length; i += 3) {
      //   delaunayTriangles.push([
      //     delaunayVertices[delaunay.triangles[i]],
      //     delaunayVertices[delaunay.triangles[i + 1]],
      //     delaunayVertices[delaunay.triangles[i + 2]],
      //   ]);
      // }
    }
  });

  return {
    delaunayVertices,
    delaunayTriangles,
    voronoiNodes,
  };
}
