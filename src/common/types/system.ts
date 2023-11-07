import { InterstellarObject } from './interstellar-object';

export interface System extends InterstellarObject {
  fullName: string;
  isCluster: boolean;
  eraAffiliations: Array<string>;
  eraCapitalLevels: Array<number>;
  eraNames: Array<string>;
}
