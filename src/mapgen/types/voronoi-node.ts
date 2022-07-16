import { Point2d } from '../../math-2d';

export interface VoronoiNode extends Point2d {
  vertex1Idx: number;
  vertex2Idx: number;
  vertex3Idx: number;
  neighborNodeIndices: number[];
  borderColors: {[index:string]: boolean};
}
