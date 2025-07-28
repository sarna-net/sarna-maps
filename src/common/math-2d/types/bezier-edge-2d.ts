import { Edge2d } from './edge-2d';
import { Point2d } from './point-2d';

export interface BezierEdge2d extends Edge2d {
  p1c1?: Point2d;
  p1c2?: Point2d;
  p2c1?: Point2d;
  p2c2?: Point2d;
}
