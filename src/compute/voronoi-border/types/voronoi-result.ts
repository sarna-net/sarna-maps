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
  affiliationLevelSections: Array<VoronoiResultHierarchyLevel>;
  /**
   * List of border loops, by hierarchy level and entity (e.g. faction) key
   */
  // borderLoops?: Array<Record<string, Array<BorderEdgeLoop>>>;
  poissonDisc: PoissonDisc<PointWithAffiliation>;
  voronoiNodes: Array<VoronoiBorderNode>;
  salientPoints?: Array<SalientPoint>;
}

export interface VoronoiResultHierarchyLevel {
  unmodifiedBorderEdges?: Record<string, Array<VoronoiBorderEdge>>;
  borderEdges: Record<string, Array<VoronoiBorderEdge>>;
  borderSections: Array<BorderSection>;
  /**
   * List of internal border sections for this hierarchy level
   */
  internalBorderSections?: Array<BorderSection>;
  /**
   * Map of border loops for this hierarchy level, by faction key
   */
  borderLoops?: Record<string, Array<BorderSection>>;
  threeWayNodes: Record<string, Array<string>>;
}
