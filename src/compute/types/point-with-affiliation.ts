import { Point2d } from '../../common';

export interface PointWithAffiliation extends Point2d {
  id: string;
  affiliation: string;
}
