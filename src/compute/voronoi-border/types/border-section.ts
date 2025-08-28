import { VoronoiBorderEdge } from './voronoi-border-edge';
import { VoronoiBorderNode } from './voronoi-border-node';

export interface BorderSection {
  id: string;
  edges: VoronoiBorderEdge[];
  isLoop: boolean;
  primaryAffiliation?: string;
  affiliation1: string;
  affiliation2: string;
  node1: VoronoiBorderNode;
  node2: VoronoiBorderNode;
  length: number;
  // only relevant for loops:
  minEdgeIdx: number;
  innerAffiliation?: string;
  outerAffiliation?: string;
  /**
   * Regional borders, by next-level affiliation (this is a hierarchical object)
   */
  children?: Record<string, Array<BorderSection>>;
}
