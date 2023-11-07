import { Point2d } from '../../math-2d';

export interface VoronoiNode extends Point2d {
  id: string;
  vertex1Idx: number;
  vertex2Idx: number;
  vertex3Idx: number;
  neighborNodeIndices: Array<number>;
}
