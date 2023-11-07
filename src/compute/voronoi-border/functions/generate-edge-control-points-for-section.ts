import { distance, dotProduct, normalizeVector, Point2d, Logger } from '../../../common';
import { BorderSection, VoronoiBorderEdge, VoronoiBorderNode } from '../types';

/**
 * For each node of the given loop, generate two bezier control points. The goal is to have rounded
 * border edges.
 *
 * Edges must be sorted.
 *
 * @param section The loop to generate control points for
 * @param threeWayNodes The global list of three way nodes
 * @param edgeMap The global edge map
 * @param tension The control point tension value
 * @param minimumDotProductForAdjacency The minimum dot product for the adjacency "straightness" test
 */
export function generateEdgeControlPointsForSection(
  section: BorderSection,
  threeWayNodes: Record<string, Array<string>>,
  edgeMap: Record<string, VoronoiBorderEdge>,
  tension = 0.3,
  minimumDotProductForAdjacency = 0.75) {
  for (let edgeIndex = 0; edgeIndex < section.edges.length; edgeIndex++) {
    const currentEdge = section.edges[edgeIndex];
    const nextEdge = section.isLoop
      ? section.edges[(edgeIndex + 1) % section.edges.length]
      : edgeIndex === section.edges.length - 1
      ? null
      : section.edges[edgeIndex + 1];

    if (!section.isLoop && edgeIndex === 0) {
      const bestCandidate = findStraightestAdjacentEdge(
        currentEdge,
        'node1',
        threeWayNodes,
        edgeMap,
        minimumDotProductForAdjacency
      );
      if (bestCandidate) {
        const controlPoints = calculateControlPoints(
          bestCandidate[0], bestCandidate[1], bestCandidate[2],
          tension,
        );
        currentEdge.n1c2 = controlPoints.c2;
      }
    }
    if (!nextEdge) {
      const bestCandidate = findStraightestAdjacentEdge(
        currentEdge,
        'node2',
        threeWayNodes,
        edgeMap,
        minimumDotProductForAdjacency,
      );
      if (bestCandidate) {
        const controlPoints = calculateControlPoints(
          bestCandidate[0], bestCandidate[1], bestCandidate[2],
          tension,
        );
        currentEdge.n2c1 = controlPoints.c1;
      }
      continue;
    }

    const controlPoints = calculateControlPoints(
      currentEdge.node1,
      currentEdge.node2,
      nextEdge.node2,
      tension,
    );

    if (!currentEdge.n2c1 && !nextEdge.n1c1) {
      currentEdge.n2c1 = controlPoints.c1;
    } else {
      currentEdge.n2c1 = (currentEdge.n2c1 || nextEdge.n1c1);
    }
    nextEdge.n1c1 = currentEdge.n2c1;
    if (!currentEdge.n2c2 && !nextEdge.n1c2) {
      currentEdge.n2c2 = controlPoints.c2;
    } else {
      currentEdge.n2c2 = (currentEdge.n2c2 || nextEdge.n1c2);
    }
    nextEdge.n1c2 = currentEdge.n2c2;
  }
}

/**
 * Helper function that generates control points c1 and c2 for the middle of three points.
 *
 * @param p1 The point preceding the middle point
 * @param p2 The middle point
 * @param p3 The point following the middle point
 * @param tension Control point tension (more tension = control points will be pulled harder towards the neighbors)
 */
function calculateControlPoints(p1: Point2d, p2: Point2d, p3: Point2d, tension: number) {
  const dist12 = distance(p1, p2);
  const dist23 = distance(p2, p3);

  // generate two control points for the looked at point (p2)
  // see http://walter.bislins.ch/blog/index.asp?page=JavaScript%3A+Bezier%2DSegmente+f%FCr+Spline+berechnen
  const fa = tension * dist12 / (dist12 + dist23);
  const fb = tension * dist23 / (dist12 + dist23);

  const w = p3.x - p1.x;
  const h = p3.y - p1.y;

  return {
    c1: {
      x: p2.x - fa * w,
      y: p2.y - fa * h,
    },
    c2: {
      x: p2.x + fb * w,
      y: p2.y + fb * h,
    },
  }
}

/**
 * Helper function that looks at a three-way node and attempts to identify the
 * edge from another section that would lead to the smoothest line if connected.
 *
 * @param currentEdge The edge we are currently looking at
 * @param pivotNode The edge's node we are looking at specifically (node1 or node2)
 * @param threeWayNodes The global list of three way nodes
 * @param edgeMap The global edge map
 * @param minimumDotProductForAdjacency The minimum dot product for the adjacency "straightness" test
 */
function findStraightestAdjacentEdge(
  currentEdge: VoronoiBorderEdge,
  pivotNode: 'node1' | 'node2',
  threeWayNodes: Record<string, Array<string>>,
  edgeMap: Record<string, VoronoiBorderEdge>,
  minimumDotProductForAdjacency: number,
) {
  const edgeCandidateIds = (threeWayNodes[currentEdge[pivotNode].id] || []).filter((id) => id !== currentEdge.id) as Array<string>;
  let bestCandidateDot = -Infinity;
  let bestCandidate: [Point2d, Point2d, Point2d] | null = null;
  const edgeNodeIds = currentEdge.id.split('-');
  edgeCandidateIds.forEach((edgeCandidateId) => {
    const adjacentEdge = edgeMap[edgeCandidateId];
    if (adjacentEdge) {
      const candidateNodeIds = edgeCandidateId.split('-');
      const commonNodeId = edgeNodeIds.filter((nodeId) => candidateNodeIds.includes(nodeId))[0];
      let n1: VoronoiBorderNode;
      let n2: VoronoiBorderNode;
      let n3: VoronoiBorderNode;
      if (pivotNode === 'node1') {
        n1 = adjacentEdge.node1.id === commonNodeId ? adjacentEdge.node2 : adjacentEdge.node1;
        n2 = currentEdge.node1;
        n3 = currentEdge.node2;
      } else {
        n1 = currentEdge.node1;
        n2 = currentEdge.node2;
        n3 = adjacentEdge.node1.id === commonNodeId ? adjacentEdge.node2 : adjacentEdge.node1;
      }
      const v1 = { a: n2.x - n1.x, b: n2.y - n1.y };
      const v2 = { a: n3.x - n2.x, b: n3.y - n2.y };
      normalizeVector(v1);
      normalizeVector(v2);
      const dot = dotProduct(v1, v2);
      // Logger.info(`Adjacent edge ${edgeCandidateId}, dot: ${dot.toFixed(4)}`);
      if (dot > bestCandidateDot && dot >= minimumDotProductForAdjacency) {
        bestCandidateDot = dot;
        bestCandidate = [ n1, n2, n3 ];
      }
    } else {
      Logger.warn(`Edge "${edgeCandidateId}" no longer exists`);
    }
  });
  return bestCandidate;
}
