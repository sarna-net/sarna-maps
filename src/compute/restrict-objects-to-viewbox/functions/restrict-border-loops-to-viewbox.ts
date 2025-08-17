import { BorderEdgeLoop, VoronoiBorderEdge } from '../../voronoi-border';
import { clampPointToRectangle, distance, Point2d, pointIsInRectangle, Rectangle2d } from '../../../common';

/**
 * Create bounded borders that only display the actually visible section of space.
 *
 * Algorithm idea:
 * - Go over each edge of each loop and check if the edge is at all visible (either edge point).
 * - If one of the points is visible, the edge is visible - add it to the visible loop
 * - Otherwise, collect the invisible edge's points into an array of outside points, which can later be
 *   used to close the loop.
 * - Once a visible edge is encountered again after looking at invisible edges, aggregate all outside
 *   points to a minimal set of edges that runs outside the frame and re-connects the visible edges
 *
 * @param borderLoops All border loops
 * @param viewBox The visible rectangle
 * @param tolerance The distance, in map units, that the viewBox is extended by in each direction, to prevent artifacts
 */
export function restrictBorderLoopsToViewbox(
  borderLoops: Record<string, Array<BorderEdgeLoop>>,
  viewBox: Rectangle2d,
  tolerance: number,
) {
  const boundedBorderLoops: Record<string, Array<BorderEdgeLoop>> = {};
  const viewBoxWithTolerance: Rectangle2d = {
    anchor: {
      x: viewBox.anchor.x - tolerance,
      y: viewBox.anchor.y - tolerance,
    },
    dimensions: {
      width: viewBox.dimensions.width + tolerance * 2,
      height: viewBox.dimensions.height + tolerance * 2,
    }
  };

  Object.keys(borderLoops).forEach((factionKey) => {
    borderLoops[factionKey].forEach((loop, loopIndex) => {
      let loopIsVisible = false;
      const boundedLoop: BorderEdgeLoop = {
        ...loop,
        edges: [],
      };
      // for the loop, go over all edges and see if they are visible
      let outsidePoints: Array<Point2d> = [];
      for (let i = 0; i < loop.edges.length; i++) {
        const previousEdge = loop.edges[i > 0 ? i - 1 : loop.edges.length - 1];
        const currentEdge = loop.edges[i];
        if (!pointIsInRectangle(currentEdge.node1, viewBoxWithTolerance)
          && !pointIsInRectangle(currentEdge.node2, viewBoxWithTolerance)) {
          // edge is outside viewbox -> add its points into the list of outside points
          outsidePoints.push({ ...previousEdge.node1 }, { ...currentEdge.node1 }, { ...currentEdge.node2 });
        } else {
          // edge is inside viewbox -> aggregate outside points into new edge and add
          // that new edge, plus the original edge
          outsidePoints.push({ ...currentEdge.node1 });
          const invisibleEdges = aggregateOutsidePointsIntoInvisibleEdges(
            `${factionKey}-L${loopIndex}-O${i}`,
            outsidePoints,
            viewBoxWithTolerance,
            currentEdge,
          );
          // reset the outside points array
          outsidePoints = [];
          boundedLoop.edges.push(...invisibleEdges, { ...currentEdge });
          loopIsVisible = true;
        }
      }
      // if, after going through all the edges, there are still outside points remaining,
      // we need to connect them to the first visible edge
      if (outsidePoints.length > 0) {
        boundedLoop.edges.push(...aggregateOutsidePointsIntoInvisibleEdges(
          `${factionKey}-L${loopIndex}-OE`,
          outsidePoints,
          viewBoxWithTolerance,
          loop.edges[0],
        ));
      }

      // if it is at all visible, add this bounded loop to the return collection
      if (loopIsVisible) {
        boundedBorderLoops[factionKey] = boundedBorderLoops[factionKey] || [];
        boundedBorderLoops[factionKey].push(boundedLoop);
      }
    });
  })

  return boundedBorderLoops;
}

/**
 * Private helper function that aggregates points into (straight) edges, removing unnecessary ones along the way
 *
 * @param idPrefix Prefix used for the ids of the new edges
 * @param outsidePoints The list of outside points to aggregate
 * @param viewBox The view rectangle
 * @param exampleEdge An example edge to take different fields from when creating the new ones
 */
function aggregateOutsidePointsIntoInvisibleEdges(
  idPrefix: string,
  outsidePoints: Array<Point2d>,
  viewBox: Rectangle2d,
  exampleEdge: VoronoiBorderEdge,
): Array<VoronoiBorderEdge> {
  const edges: Array<VoronoiBorderEdge> = [];
  if (outsidePoints.length < 2) {
    return edges;
  }
  // helper function
  const newEdge = (p1: Point2d, p2: Point2d) => ({
    id: `${idPrefix}-${edges.length}`,
    node1: {
      ...p1,
      id: `${idPrefix}-${edges.length}-n1`,
      borderAffiliations: {},
      neighborNodeIndices: [],
      vertex1Idx: 0,
      vertex2Idx: 0,
      vertex3Idx: 0,
    },
    node2: {
      ...p2,
      id: `${idPrefix}-${edges.length}-n2`,
      borderAffiliations: {},
      neighborNodeIndices: [],
      vertex1Idx: 0,
      vertex2Idx: 0,
      vertex3Idx: 0,
    },
    isInvisible: true,
    length: distance(p1, p2),
    affiliation1: exampleEdge.affiliation1,
    affiliation2: exampleEdge.affiliation2,
    leftAffiliation: exampleEdge.leftAffiliation,
    rightAffiliation: exampleEdge.rightAffiliation,
    closeness: 0,
    vertex1Idx: 0,
    vertex2Idx: 0,
  });

  // clamp all points to the rectangle
  for (let i = 0; i < outsidePoints.length; i++) {
    clampPointToRectangle(outsidePoints[i], viewBox);
    // Look at the clamped points in groups of threes, and remove the middle one if there is no direction change.
    // If there is a direction change, create an edge from the first two points
    if (i >= 2) {
      if (
        (outsidePoints[i - 2].x === outsidePoints[i - 1].x && outsidePoints[i - 1].x === outsidePoints[i].x) ||
        (outsidePoints[i - 2].y === outsidePoints[i - 1].y && outsidePoints[i - 1].y === outsidePoints[i].y)
      ) {
        // the middle point can be removed
        outsidePoints.splice(i - 1, 1);
        i--;
      } else {
        // there is a direction change, create an invisible edge and remove the first point
        edges.push(newEdge(outsidePoints[i - 2], outsidePoints[i - 1]));
        outsidePoints.splice(i - 2, 1);
        i--;
      }
    }
  }
  // at the very end, if there are more or less than two points remaining, something went wrong
  if (outsidePoints.length !== 2) {
    console.warn(idPrefix, 'wrong remaining number of outside points', outsidePoints.length);
    return edges;
  }
  edges.push(newEdge(outsidePoints[0], outsidePoints[1]));
  return edges;
}
