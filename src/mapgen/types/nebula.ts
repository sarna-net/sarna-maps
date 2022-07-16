import { InterstellarObject } from './interstellar-object';

export interface Nebula extends InterstellarObject {
  centerX: number,
  centerY: number,
  width: number,
  height: number
}
