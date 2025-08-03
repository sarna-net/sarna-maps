import { PointWithAffiliation } from '../types';
import { BorderDelaunayVertex, BorderEdgeLoop, VoronoiBorderEdge, VoronoiResult } from './types';
import {
  Era,
  System,
  deepCopy,
  dynamicImport,
  extractBorderStateAffiliation,
  generateVoronoiNodes,
  PoissonDisc,
  PoissonSettings,
  VoronoiCellMode,
} from '../../common';
import {
  generateBorderSections,
  generateBorderEdges,
  simplifyBorderSections,
  connectSalients,
  mergeBorderSections,
  generateEdgeControlPointsForSection,
  generateSimpleBorderLoops,
  generateBorderLoops,
  separateBorderLoops,
  calculateSectionLength,
} from './functions';
import { EMPTY_FACTION } from '../constants';

// define affiliations that do not factor into any of the border calculations
const IRRELEVANT_AFFILIATIONS = ['U', 'A', ''];

export async function calculateVoronoiBorders(
  systems: Array<System>,
  era: Era,
  poissonSettings: Partial<PoissonSettings> = {},
  borderSeparation = 0.5,
  controlPointTension = 0.35,
  cellMode: VoronoiCellMode = VoronoiCellMode.Circumcenters,
): Promise<VoronoiResult> {
  const Delaunator = (await dynamicImport('delaunator')).default;

  // generate noise points for anything outside the actual borders
  const defaultPoissonPoint: PointWithAffiliation = {
    id: 'poisson-point',
    x: 0,
    y: 0,
    affiliation: EMPTY_FACTION,
  };
  const poissonDisc = new PoissonDisc<PointWithAffiliation>(poissonSettings, defaultPoissonPoint).run();

  // add a special reserved point next to Sol, because the distance to Rigil Kentarus is so small
  const terra = systems.find((system) => system.name === 'Sol');
  const solAffiliation = extractBorderStateAffiliation(terra?.eraAffiliations[era.index] || '');

  let voronoiResult: VoronoiResult = performVoronoiCalculations(
    Delaunator,
    cellMode,
    poissonDisc,
    systems,
    [],
    era,
    solAffiliation
  );

  const simpleBorderLoops = generateSimpleBorderLoops(voronoiResult.borderSections);

  const salientPoints = connectSalients(simpleBorderLoops);
  if (salientPoints.length) {
    // re-run the voronoi calculations with the additional salient points
    voronoiResult = performVoronoiCalculations(
      Delaunator,
      cellMode,
      poissonDisc,
      systems,
      salientPoints,
      era,
      solAffiliation
    );
  }
  // keep a copy of the original border edges array
  voronoiResult.unmodifiedBorderEdges = deepCopy(voronoiResult.borderEdges);

  // merge smaller border sections into larger ones
  mergeBorderSections(voronoiResult.borderSections);

  // simplify border sections by removing short edges and straightening the edge flow
  simplifyBorderSections(
    voronoiResult.borderSections,
    voronoiResult.delaunayVertices,
    voronoiResult.threeWayNodes
  );

  // create a map with key = edge id
  const edgeMap: Record<string, VoronoiBorderEdge> = {};
  voronoiResult.borderSections.forEach((borderSection) => {
    borderSection.edges.forEach((edge) => {
      edgeMap[edge.id] = edge;
    });
  });

  // generate control points for each border section separately
  voronoiResult.borderSections.forEach((borderSection) => {
    generateEdgeControlPointsForSection(borderSection, voronoiResult.threeWayNodes, edgeMap);
  });

  // create edge loops for each faction
  const borderLoops = generateBorderLoops(voronoiResult.borderSections, voronoiResult.delaunayVertices);

  // separate edge loop borders
  separateBorderLoops(borderLoops, voronoiResult.delaunayVertices);

  Object.keys(borderLoops).forEach((factionId) => {
    const loops = borderLoops[factionId];
    loops.forEach((loop) => {
      calculateSectionLength(loop);
      (loop as BorderEdgeLoop).isInnerLoop = loop.innerAffiliation !== factionId;
    });
  });

  // processBorderLoops(borderLoops, vertices, borderSeparation, controlPointTension);

  return {
    ...voronoiResult,
    salientPoints,
    borderLoops,
  };
}

/**
 * Helper function that executes everything prior to the merge / simplify steps.
 * This includes delaunay triangulation, constructing the voronoi diagram,
 * finding border edges and constructing sections.
 *
 * May be executed multiple times.
 *
 * @param Delaunator The Delaunator instance
 * @param cellMode Voronoi cell mode to use
 * @param poissonDisc The poisson disc instance
 * @param systems The list of systems
 * @param salientPoints The list of salient points
 * @param era The era to use
 * @param solAffiliation The affiliation of the sol system in the given era
 */
function performVoronoiCalculations(
  Delaunator: any,
  cellMode: VoronoiCellMode,
  poissonDisc: PoissonDisc<PointWithAffiliation>,
  systems: Array<System>,
  salientPoints: Array<PointWithAffiliation>,
  era: Era,
  solAffiliation: string
): VoronoiResult {
  poissonDisc.replaceReservedPoints([
    ...systems.map((system) => ({
      id: system.id,
      x: system.x,
      y: system.y,
      affiliation: extractBorderStateAffiliation(system.eraAffiliations[era.index]),
    })).filter((system) => !IRRELEVANT_AFFILIATIONS.includes(system.affiliation)),
    ...salientPoints,
    {id: 'sol-buffer-point-1', x: 1, y: 3, affiliation: solAffiliation},
    {id: 'sol-buffer-point-2', x: 2.5, y: -1.25, affiliation: solAffiliation},
  ]);

  // filter out points that are irrelevant for drawing the borders, then add an empty adjacency list to each relevant point
  const delaunayVertices: Array<BorderDelaunayVertex> = poissonDisc.aggregatedPoints
    .filter((poissonPoint) =>  !IRRELEVANT_AFFILIATIONS.includes(poissonPoint.affiliation))
    .map((poissonPoint) => ({ ...poissonPoint, adjacentTriIndices: [] }));
  // run delaunay triangulation (using the delaunator library)
  const delaunay = Delaunator.from(delaunayVertices.map((vertex) => [vertex.x, vertex.y]));
  // TODO are these really needed, or are they just for visual debugging?
  //   In that case, maybe it's enough to pass the delaunay object
  const delaunayTriangles: Array<[BorderDelaunayVertex, BorderDelaunayVertex, BorderDelaunayVertex]> = [];
  for (let i = 0; i < delaunay.triangles.length; i += 3) {
    delaunayTriangles.push([
      delaunayVertices[delaunay.triangles[i]],
      delaunayVertices[delaunay.triangles[i + 1]],
      delaunayVertices[delaunay.triangles[i + 2]],
    ]);
  }
  // create the voronoi nodes based on the triangulation
  const voronoiNodes = generateVoronoiNodes(delaunay, delaunayVertices, cellMode).map((node) => ({
    ...node,
    borderAffiliations: {},
  }));
  // process the voronoi nodes and generate border edges
  const { borderEdges, threeWayNodes } = generateBorderEdges(
    voronoiNodes,
    delaunayVertices,
  );
  // create border sections
  const borderSections = generateBorderSections(borderEdges);

  return {
    delaunayVertices,
    delaunayTriangles,
    borderEdges,
    borderSections,
    poissonDisc,
    threeWayNodes,
    voronoiNodes,
  };
}
