import { Point2d } from '../../math-2d';

export interface DelaunayVertex extends Point2d {
  adjacentTriIndices: number[];
}
