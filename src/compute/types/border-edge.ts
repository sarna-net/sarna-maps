import { Point2d } from '../../common';

export interface BorderEdge {
  id: string;
  affiliation1: string;
  affiliation2: string;
  leftAffiliation: string;
  rightAffiliation: string;
  length: number;
  closeness: number;
  n1c1?: Point2d;
  n1c2?: Point2d;
  n2c1?: Point2d;
  n2c2?: Point2d;
}
