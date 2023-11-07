import { Point2d } from '../math-2d';

export interface InterstellarObject extends Point2d {
  id: string;
  name: string;
  radiusX: number;
  radiusY: number;
  rotation: number;
}
