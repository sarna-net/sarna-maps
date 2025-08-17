import { BorderSection } from './border-section';
import { VoronoiBorderNode } from './voronoi-border-node';
import { VoronoiBorderEdge } from './voronoi-border-edge';
import { BorderEdgeLoop } from './border-edge-loop';
import { BorderDelaunayVertex } from './border-delaunay-vertex';
import { DelaunayTriangle, PoissonDisc } from '../../../common';
import { PointWithAffiliation, SalientPoint } from '../../types';

export interface VoronoiResult {
  delaunayVertices: Array<BorderDelaunayVertex>;
  delaunayTriangles: Array<DelaunayTriangle<BorderDelaunayVertex>>;
  borderEdges: Record<string, Array<VoronoiBorderEdge>>;
  unmodifiedBorderEdges?: Record<string, Array<VoronoiBorderEdge>>;
  borderSections: Array<BorderSection>;
  borderLoops?: Record<string, Array<BorderEdgeLoop>>;
  poissonDisc: PoissonDisc<PointWithAffiliation>;
  threeWayNodes: Record<string, Array<string>>;
  voronoiNodes: Array<VoronoiBorderNode>;
  salientPoints?: Array<SalientPoint>;
}
