import { VoronoiNode } from '../../../common';

export interface VoronoiBorderNode extends VoronoiNode {
  borderAffiliations: Record<string, boolean>;
}
