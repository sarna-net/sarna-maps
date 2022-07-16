import { InterstellarObject } from './interstellar-object';

export interface System extends InterstellarObject {
  fullName: string,
  isCluster: boolean,
  eraAffiliations: string[],
  eraCapitalLevels: number[],
  eraNames: string[]
}
