import { LabelGraphNode } from '../types';
import { distance, nearestPointOnLineSegment, scaleVector } from '../../../common';

/**
 * Relaxes / straightens a path defined by a list of nodes, in-place.
 * The algorithm looks at sequences of three nodes, and moves the second node towards the straight line connecting the
 * other two nodes.
 *
 * @param nodes The original path (will be modified)
 * @param tension The amount of relaxation to apply (higher is more)
 * @returns The relaxed path, for chaining
 */
export function relaxPath(nodes: Array<LabelGraphNode>, tension = 0.1) {
  for (let i = 0; i < nodes.length - 2; i++) {
    const startPoint = nodes[i];
    const midPoint = nodes[i + 1];
    const endPoint = nodes[i + 2];
    const totalLength = distance(startPoint, midPoint) + distance(midPoint, endPoint);
    const pullPoint = nearestPointOnLineSegment(startPoint, endPoint, midPoint) || midPoint;
    const distanceToPullPoint = distance(midPoint, pullPoint);
    const moveDistance = Math.min(totalLength * tension, distanceToPullPoint);
    if (moveDistance > 0) {
      const moveVector = { a: pullPoint.x - midPoint.x, b: pullPoint.y - midPoint.y };
      scaleVector(moveVector, moveDistance);
      midPoint.x += moveVector.a;
      midPoint.y += moveVector.b;
    }
  }
  return nodes;
}
