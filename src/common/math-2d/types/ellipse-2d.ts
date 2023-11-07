import { Point2d } from './point-2d';

/**
 * An ellipse in 2D space
 */
export interface Ellipse2d {
  center: Point2d;
  radiusX: number;
  radiusY: number;
  // rotation: number; // TODO add rotation calculations
}
