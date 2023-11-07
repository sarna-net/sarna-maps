import { SnapPosition } from '../../../Constants';

export interface ScaleDisplayOptions {
  display?: boolean;
  position: SnapPosition;
  width: number;
  stepSize: number;
}
