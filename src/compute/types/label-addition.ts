import { Point2d } from '../../common';

export interface LabelAddition {
  text: string;
  class: string;
  delta: Point2d; // offset from label anchor
}
