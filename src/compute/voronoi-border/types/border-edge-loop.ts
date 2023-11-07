import { VoronoiBorderEdge } from './voronoi-border-edge';

export interface BorderEdgeLoop {
  edges: VoronoiBorderEdge[];
  minEdgeIdx: number;
  innerAffiliation?: string;
  outerAffiliation?: string;
}
