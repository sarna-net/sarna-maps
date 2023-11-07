import { IdentifiableRectangle, Point2d } from '../../common';
import { LabelAddition } from './label-addition';

export interface LabelRectangle extends IdentifiableRectangle {
  parent: IdentifiableRectangle;
  processed: boolean;
  delta: Point2d; // offset of label text from anchor
  padding: {
    x: number;
    y: number;
  };
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  }
  affiliation: string;
  connectorPoints?: Array<Point2d>;
  additions: Array<LabelAddition>;
}
