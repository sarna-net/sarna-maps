import { distance, Point2d, scaleVector } from '../../common';
import { BorderEdgeLoop } from '../voronoi-border';

/**
 * The loop's edges need to be arranged in clockwise order.
 *
 * @param loop The edge loop
 */
export function generateEvenlyDistributedPointsAlongEdgeLoop(loop: BorderEdgeLoop) {
  const points: Array<Point2d> = []

  const totalLength = loop.edges
    .map((edge) => edge.length)
    .reduce((length, sum) => sum + length, 0);

  let travelledDistance = 0;
  let step = 50;
  let currentPosition: Point2d = { x: loop.edges[0].node1.x, y: loop.edges[0].node1.y };
  let remainingDistance = step;
  let currentEdgeIndex = 0;
  points.push(currentPosition);
  while (travelledDistance <= totalLength - step && currentEdgeIndex < loop.edges.length - 1) {
    console.log(currentEdgeIndex);
    // check distance to next node
    const dist = distance(currentPosition, loop.edges[currentEdgeIndex + 1].node1);
    if (dist > remainingDistance) {
      // The next point lies between the current point and the next edge node.
      // Insert a new point at that position and continue from there.
      // Find position by adding an appropriately sized and oriented vector to the current position
      const addVector = {
        a: loop.edges[currentEdgeIndex + 1].node1.x - currentPosition.x,
        b: loop.edges[currentEdgeIndex + 1].node1.y - currentPosition.y,
      };
      scaleVector(addVector, remainingDistance);
      currentPosition = { x: currentPosition.x + addVector.a, y: currentPosition.y + addVector.b };
      points.push(currentPosition);
      // increment travelled distance
      travelledDistance += step;
      // reset remainingDistance
      remainingDistance = step;
    } else if (dist <= remainingDistance) {
      // The next point lies beyond the next edge node. Set the current point to the edge node and
      // subtract the travelled distance from the remaining distance to go.
      currentPosition = {
        x: loop.edges[currentEdgeIndex + 1].node1.x,
        y: loop.edges[currentEdgeIndex + 1].node1.y,
      };
      remainingDistance -= dist;
      // special case: The next point is precisely on the next edge node
      if (dist === remainingDistance) {
        points.push(currentPosition);
        travelledDistance += step;
        remainingDistance = step;
      }
      // step to the next edge for the next iteration
      currentEdgeIndex += 1;
    }
  }

  console.log(`${points.length} POINTS FOR ${loop.edges.length} NODES (${travelledDistance} of ${totalLength} with STEP = ${step})`);

  return points;
  //
  // for (let i = 0; i < currentEdge.length; i++) {
  //   if (!startPoint) {
  //     startPoint = loop.edges[0].node1;
  //     points.push(startPoint);
  //   }
  //   currentEdgeVector = { a: startPoint.x - }
  // }


}
