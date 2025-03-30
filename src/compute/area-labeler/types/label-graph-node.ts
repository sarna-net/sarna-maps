import { Point2d } from '../../../common';

export interface LabelGraphNode extends Point2d {
  id: string;
  c1?: Point2d;
  c2?: Point2d;
  connections: Record<string, number>;
}
