import { BorderDelaunayVertex, BorderEdgeLoop, VoronoiBorderEdge } from '../types';
import { addVectors, movePoint, normalizeVector, scaleVector, Vector2d, deepCopy } from '../../../common';

/**
 * Separates border loops from each other by pulling the borders towards their respective
 * faction's systems.
 *
 * Note that each border loop's edges should already be ordered clockwise when executing this function.
 *
 * @param loops The border loops by faction (will be modified)
 * @param vertices List of all delaunay vertices
 * @param tension The amount of distance that any given edge will be pulled
 */
export function separateBorderLoops(
  loops: Record<string, Array<BorderEdgeLoop>>,
  vertices: Array<BorderDelaunayVertex>,
  tension = 0.5,
) {
  for (let faction in loops) {
    loops[faction].forEach((loop) => {
      pullEdgeLoop(loop, vertices, loop.innerAffiliation === faction ? tension : -tension);
    });
  }
}

/**
 * Pulls each edge of a single edge loop closer to its same-faction vertex.
 *
 * @param loop The loop to modify
 * @param vertices The list of delaunay vertices (systems)
 * @param tension The amount of distance that any given edge will be pulled
 */
function pullEdgeLoop(loop: BorderEdgeLoop, vertices: Array<BorderDelaunayVertex>, tension: number) {
  const originalEdges = deepCopy<Array<VoronoiBorderEdge>>(loop.edges);
  for(let curEdgeIdx = 0; curEdgeIdx < loop.edges.length; curEdgeIdx++) {
    // We're always looking at the current edge's second node (node2), which is identical to the
    // loop's next edge's first node. The node will be pulled towards the two right-side vertices
    // Note that the loop's edges are in clockwise order, so the "inner" vertices are the same affiliation as the edge loop.
    const currentEdge = loop.edges[curEdgeIdx];
    const originalEdge = originalEdges[curEdgeIdx];
    const nextEdge = loop.edges[(curEdgeIdx + 1) % loop.edges.length];
    const translationVector: Vector2d = { a: 0, b: 0 };

    const point1 = originalEdge.node1;
    const point2 = originalEdge.node2;
    const point3 = nextEdge.node2;

    const vector1 = { a: point2.x - point1.x, b: point2.y - point1.y };
    const vector2 = { a: point3.x - point2.x, b: point3.y - point2.y };

    // right-side perpendicular vectors
    const pVector1 = { a: vector1.b, b: -vector1.a };
    const pVector2 = { a: vector2.b, b: -vector2.a };

    normalizeVector(pVector1);
    normalizeVector(pVector2);
    addVectors(translationVector, pVector1);
    addVectors(translationVector, pVector2);
    scaleVector(translationVector, tension);

    // move the point in question
    // note that the original point is cached, so that these operations do not
    // have an effect on the next iteration
    movePoint(currentEdge.node2, translationVector);
    currentEdge.n2c1 && movePoint(currentEdge.n2c1, translationVector);
    currentEdge.n2c2 && movePoint(currentEdge.n2c2, translationVector);
    movePoint(nextEdge.node1, translationVector);
    nextEdge.n1c1 && movePoint(nextEdge.n1c1, translationVector);
    nextEdge.n1c2 && movePoint(nextEdge.n1c2, translationVector);
  }
}
