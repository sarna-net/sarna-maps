import { BezierEdge2d } from './types';
import { distance } from './distance';

export function edgeLength(edge: BezierEdge2d) {
  const straightDistance = distance(edge.p1, edge.p2);
  const controlPointPath = [edge.p1, edge.p1c2, edge.p2c1, edge.p2].filter((point) => !!point);
  if (controlPointPath.length === 2) {
    return straightDistance;
  } else if (controlPointPath.length > 2) {
    // Assuming that our bezier curves are fairly "normal" (not "tricky", as described in the source below)
    // we use a rough approximation of the true length:
    // 2/3 times the path length of the control points path + 1/3 the straight distance
    // https://raphlinus.github.io/curves/2018/12/28/bezier-arclength.html
    let controlPointDistance = 0;
    for (let i = 0; i < controlPointPath.length - 1; i++) {
      controlPointDistance += distance(controlPointPath[i], controlPointPath[i + 1]);
    }
    return (controlPointDistance * 2 + straightDistance) / 3;
  }
  console.warn('[edgeLength] edge does not have enough points to be measured, length is 0', edge);
  return 0;
}
