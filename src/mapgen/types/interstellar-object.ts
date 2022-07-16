import { Point2d } from '../../math-2d';

export interface InterstellarObject extends Point2d {
  name: string,
  radiusX: number,
  radiusY: number,
  rotation: number
}
