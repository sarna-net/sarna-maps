import { Edge2d } from '../../../common';

export interface LabelGraphEdge extends Edge2d {
  index: number;
  isPerimeterEdge: boolean;
  neighborIndices: Array<number>;
}
