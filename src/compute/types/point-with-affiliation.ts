import { Point2d } from '../../common';

export interface PointWithAffiliation extends Point2d {
  affiliation: string;
}
