import { Point2d } from '../math-2d';

export interface ConnectionLine {
  id: string;
  distance: number;
  from: Point2d;
  to: Point2d;
}
