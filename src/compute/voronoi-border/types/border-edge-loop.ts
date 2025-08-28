import { VoronoiBorderEdge } from './voronoi-border-edge';

// TODO this type should be defined outside the voronoi border logic
export interface BorderEdgeLoop {
  edges: VoronoiBorderEdge[];
  minEdgeIdx: number;
  innerAffiliation?: string;
  outerAffiliation?: string;
  isInnerLoop?: boolean;
  length?: number;
}
