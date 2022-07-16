import { Point2d } from '../../math-2d';
import { Color } from './color';

export interface DelaunayVertex extends Point2d {
    color: Color;
    adjacentTriIndices: number[];
}
