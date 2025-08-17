import { BorderEdgeLoop } from '../voronoi-border';
import {
  DelaunayVertex, distance,
  dynamicImport, generateBezierControlPoints,
  lineSegmentIntersection,
  Point2d, pointIsLeftOfLine,
} from '../../common';
import { generateEvenlyDistributedPointsAlongEdgeLoop } from './generate-evenly-distributed-points-along-edge-loop';
import { LabelGraphEdge, LabelGraphNode, PathResult } from './types';
import Graph from 'node-dijkstra';
import { relaxPath } from './functions';
import { removeShortEdges } from './functions/remove-short-edges';

/**
 * Algorithm as presented and implemented here:
 * https://gist.github.com/veltman/403f95aee728d4a043b142c52c113f82
 *
 * General idea:
 * 1. Turn the shape into a polygon of evenly-spaced points.
 * 2. Generate a Voronoi diagram of those points.
 * 3. Clip the edges.
 * 4. Turn the edges into a graph.
 * 5. Find the "longest shortest path" between any pair of perimeter nodes.
 * 6. Smooth/simplify that path a bit.
 * 7. Place text along the smoothed centerline with a <textPath>.
 *
 * Uses https://github.com/albertorestifo/node-dijkstra to find shortest paths.
 *
 * Alternative idea for area labels:
 * https://www.npmjs.com/package/polylabel
 */
export async function placeAreaLabels(borderLoops: Array<BorderEdgeLoop>) {
  const { Delaunay } = (await dynamicImport('d3-delaunay'));

  let delaunayVertices: Array<DelaunayVertex>;
  const delaunayTriangles: Array<{ p1: Point2d, p2: Point2d, p3: Point2d }> = [];
  let voronoi: any | null;

  const borderEdges = borderLoops
    .map((loop) => loop.edges)
    .reduce((accumulator, current) => { accumulator.push(...current); return accumulator; }, []);
  // borderLoops.forEach((loop) => {
  //   borderEdges.push(...loop.edges);
  // });
  delaunayVertices = generateEvenlyDistributedPointsAlongEdgeLoop(borderLoops[0])
    .map((point) => ({ ...point, adjacentTriIndices: [] }));
  // borderLoops[faction].forEach((loop) => {
  //   loop.edges.forEach((edge) => {
  //     delaunayVertices.push({ x: edge.node1.x, y: edge.node1.y, adjacentTriIndices: [] });
  //   });
  // });
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  borderEdges.forEach((edge) => {
    bounds[0] = Math.min(bounds[0], edge.node1.x - 1); //  TODO magic number
    bounds[1] = Math.min(bounds[1], edge.node1.y - 1);
    bounds[2] = Math.max(bounds[2], edge.node1.x + 1);
    bounds[3] = Math.max(bounds[3], edge.node1.y + 1);
  });
  if (bounds[0] === Infinity) {
    bounds[0] = -2000;
    bounds[1] = -2000;
    bounds[2] = 2000;
    bounds[3] = 2000;
  }

  const delaunay = Delaunay.from(delaunayVertices.map((vertex) => [vertex.x, vertex.y]));
  for (let i = 0; i < delaunay.triangles.length; i += 3) {
    delaunayTriangles.push({
      p1: delaunayVertices[delaunay.triangles[i]],
      p2: delaunayVertices[delaunay.triangles[i + 1]],
      p3: delaunayVertices[delaunay.triangles[i + 2]],
    });
  }
  voronoi = delaunay.voronoi(bounds);
  // voronoiNodes = generateVoronoiNodes(delaunay, delaunayVertices, VoronoiCellMode.Centroids);

  // const delaunayTriangles: Array<[DelaunayVertex, DelaunayVertex, DelaunayVertex]> = [];
  // for (let i = 0; i < delaunay.triangles.length; i += 3) {
  //   delaunayTriangles.push([
  //     delaunayVertices[delaunay.triangles[i]],
  //     delaunayVertices[delaunay.triangles[i + 1]],
  //     delaunayVertices[delaunay.triangles[i + 2]],
  //   ]);
  // }

  if (!voronoi) {
    throw new Error('no Voronoi diagram object available');
  }

  const graphEdges: Array<LabelGraphEdge> = [];

  function _regioncode(x: number, y: number) {
    return (x < bounds[0] ? 0b0001
        : x > bounds[2] ? 0b0010 : 0b0000)
      | (y < bounds[1] ? 0b0100
        : y > bounds[3] ? 0b1000 : 0b0000);
  }
  function _clipSegment(x0: number, y0: number, x1: number, y1: number, c0: number, c1: number) {
    // for more robustness, always consider the segment in the same order
    const flip = c0 < c1;
    if (flip) [x0, y0, x1, y1, c0, c1] = [x1, y1, x0, y0, c1, c0];
    while (true) {
      if (c0 === 0 && c1 === 0) return flip ? [x1, y1, x0, y0] : [x0, y0, x1, y1];
      if (c0 & c1) return null;
      let x, y, c = c0 || c1;
      if (c & 0b1000) x = x0 + (x1 - x0) * (bounds[3] - y0) / (y1 - y0), y = bounds[3];
      else if (c & 0b0100) x = x0 + (x1 - x0) * (bounds[1] - y0) / (y1 - y0), y = bounds[1];
      else if (c & 0b0010) y = y0 + (y1 - y0) * (bounds[2] - x0) / (x1 - x0), x = bounds[2];
      else y = y0 + (y1 - y0) * (bounds[0] - x0) / (x1 - x0), x = bounds[0];
      if (c0) x0 = x, y0 = y, c0 = _regioncode(x0, y0);
      else x1 = x, y1 = y, c1 = _regioncode(x1, y1);
    }
  }

  for (let i = 0; i < delaunay.halfedges.length; i++) {
    const j = delaunay.halfedges[i];
    if (j < i) {
      continue;
    }
    const ti = Math.floor(i / 3) * 2;
    const tj = Math.floor(j / 3) * 2;
    let xi = voronoi.circumcenters[ti];
    let yi = voronoi.circumcenters[ti + 1];
    let xj = voronoi.circumcenters[tj];
    let yj = voronoi.circumcenters[tj + 1];
    const c0 = _regioncode(xi, yi);
    const c1 = _regioncode(xj, yj);
    if (c0 + c1 !== 0) {
      const clipped = _clipSegment(xi, yi, xj, yj, c0, c1);
      if (clipped) {
        xi = clipped[0];
        yi = clipped[1];
        xj = clipped[2];
        yj = clipped[3];
      } else {
        continue;
      }
    }

    let graphEdge = {
      index: graphEdges.length,
      p1: { x: xi, y: yi },
      p2: { x: xj, y: yj },
      isPerimeterEdge: false,
      neighborIndices: [],
    }

    // detect intersections with border edges
    // TODO implementation is very inefficient. Solution: Use a quadtree or similar structure
    for (let borderEdgeIdx = 0; borderEdgeIdx < borderEdges.length; borderEdgeIdx++) {
      const edge = borderEdges[borderEdgeIdx];
      const intersection = lineSegmentIntersection(
        graphEdge,
        {
          p1: edge.node1,
          p2: edge.node2,
        },
      );
      if (intersection) {
        const l1 = pointIsLeftOfLine(graphEdge.p1, edge.node1, edge.node2);
        const l2 = pointIsLeftOfLine(graphEdge.p2, edge.node1, edge.node2);
        if (l1 !== l2) {
          graphEdge.isPerimeterEdge = true;
          if (l1) {
            // point 1 is left of line = outside (TODO what about inner loops?)
            // --> modify edge to go from intersection point to p2
            graphEdge.p1 = intersection;
          } else {
            // point 2 is left of line = inside
            // --> perimeter edge from p1 to intersection point
            graphEdge.p2 = intersection;
          }
          break;
        }
      }
    }

    graphEdges.push(graphEdge);
  }

  // find graph edge neighbors

  // implement like this to generate graph:
  // - for each edge, look at both nodes.
  // - Set node Id = String(node.x, node.y)
  // - if graph node with this id does not exist already, add it into the graph with empty connection array
  // - add edge's other node ID to connection array, and vice versa, with dist = edge length.
  // - finally, find perimeter nodes (connection array length = 1) and search shortest paths
  const graphNodes: Record<string, LabelGraphNode> = {};
  graphEdges.forEach((edge) => {
    const edgeLength = distance(edge.p1, edge.p2);
    const p1Id = `NODE@${edge.p1.x.toFixed(3)}|${edge.p1.y.toFixed(3)}`;
    const p2Id = `NODE@${edge.p2.x.toFixed(3)}|${edge.p2.y.toFixed(3)}`;
    if (!graphNodes[p1Id]) {
      graphNodes[p1Id] = { id: p1Id, connections: {}, ...edge.p1 };
    }
    if (!graphNodes[p2Id]) {
      graphNodes[p2Id] = { id: p2Id, connections: {}, ...edge.p2 };
    }
    graphNodes[p1Id].connections[p2Id] = edgeLength;
    graphNodes[p2Id].connections[p1Id] = edgeLength;
  });
  // construct dijkstra graph and remember perimeter nodes
  const dijkstraGraph = new Graph();
  const perimeterNodeIds: Array<string> = [];
  Object.values(graphNodes).forEach((node) => {
    dijkstraGraph.addNode(node.id, node.connections);
    if (Object.keys(node.connections).length === 1) {
      perimeterNodeIds.push(node.id);
    }
  });

  let longestPath: PathResult = { path: [], cost: 0 };
  for (let i = 0; i < perimeterNodeIds.length; i++) {
    for (let j = i + 1; j < perimeterNodeIds.length; j++) {
      const path = dijkstraGraph.path(perimeterNodeIds[i], perimeterNodeIds[j], { cost: true, trim: true }) as PathResult;
      if (path.cost > longestPath.cost) {
        longestPath = path;
      }
    }
  }
  let finalPath = longestPath.path.map((nodeId) => graphNodes[nodeId]);
  if (finalPath.length >= 2 && finalPath[0].x > finalPath[finalPath.length - 1].x) {
    finalPath.reverse();
  }
  removeShortEdges(relaxPath(removeShortEdges(finalPath), 0.5));
  for (let i = 1; i < finalPath.length - 1; i++) {
    const node = finalPath[i];
    const { c1, c2 } = generateBezierControlPoints(finalPath[i - 1], finalPath[i], finalPath[i + 1], 0.05);
    node.c1 = c1;
    node.c2 = c2;
  }

  return {
    delaunayVertices,
    delaunayTriangles,
    voronoi,
    graphEdges,
    longestPath: finalPath,
  };
}
