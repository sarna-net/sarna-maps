import { VoronoiBorderNode } from './voronoi-border-node';
import { BorderEdge } from '../../types';

export interface VoronoiBorderEdge extends BorderEdge {
  node1: VoronoiBorderNode;
  node2: VoronoiBorderNode;
  vertex1Idx: number;
  vertex2Idx: number;
}
