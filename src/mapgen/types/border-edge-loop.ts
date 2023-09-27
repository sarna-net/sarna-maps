import { BorderEdge } from './border-edge';
import { Color } from './color';

export interface BorderEdgeLoop {
  edges: BorderEdge[];
  minEdgeIdx: number;
  innerColor?: Color;
}
