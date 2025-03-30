import { Point2d } from '../../common';

export interface FactionLabel {
  id: string;
  color: string;
  labelPath: Array<Point2d>;
  labelPathLength: number;
  labelTokens: Array<string>;
}
