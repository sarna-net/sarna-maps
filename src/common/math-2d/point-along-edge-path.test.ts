import { describe, it, expect } from 'vitest';
import { BezierEdge2d } from './types';
import { pointAlongEdgePath } from './point-along-edge-path';
import { distance } from './distance';

describe('pointAlongEdgePath', () => {

  it('should correctly calculate the distance and dot product for a few basic cases', () => {
    const edgePath: Array<BezierEdge2d> = [{
      p1: { x: -100, y: 0 },
      p2: { x: 0, y: 0 },
    }, {
      p1: { x: 0, y: 0 },
      p2: { x: 100, y: 0 },
    }, {
      p1: { x: 100, y: 0 },
      p2: { x: 100, y: 100 },
    }, {
      p1: { x: 100, y: 100  },
      p2: { x: -100, y: 0 },
    }];
    edgePath.forEach((edge) => edge.length = distance(edge.p1, edge.p2));
    const result1 = pointAlongEdgePath(edgePath, 0, true);
    expect(result1).toBeDefined();
    expect(result1?.distanceToClosestPoint).toBe(0);
    expect(Math.round((result1?.adjacentEdgesDotProduct || 0) * 100)).toBe(89); // acute angle

    const result2 = pointAlongEdgePath(edgePath, 80, true);
    expect(result2).toBeDefined();
    expect(result2?.distanceToClosestPoint).toBe(20);
    expect(result2?.adjacentEdgesDotProduct).toBe(-1); // edges lie on the same plane

    const result3 = pointAlongEdgePath(edgePath, 190, true);
    expect(result3).toBeDefined();
    expect(result3?.distanceToClosestPoint).toBe(10);
    expect(result3?.adjacentEdgesDotProduct).toBe(0); // edges have a 90° angle with each other
  });
});
