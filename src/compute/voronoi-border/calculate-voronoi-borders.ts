import { PointWithAffiliation } from '../types';
import {
  BorderDelaunayVertex,
  BorderEdgeLoop, BorderSection,
  VoronoiBorderEdge,
  VoronoiResult,
  VoronoiResultHierarchyLevel
} from './types';
import {
  Era,
  System,
  deepCopy,
  dynamicImport,
  extractBorderStateAffiliation,
  generateVoronoiNodes,
  PoissonDisc,
  PoissonSettings,
  VoronoiCellMode, logger,
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
  connectInternalBorderSections,
} from './functions';
import { EMPTY_FACTION } from '../constants';

// define affiliations that do not factor into any of the border calculations
const IRRELEVANT_AFFILIATIONS = ['U', 'A', ''];

export async function calculateVoronoiBorders(
  systems: Array<System>,
  era: Era,
  poissonSettings: Partial<PoissonSettings> = {},
  affiliationLevels: number,
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

  // If no affiliation levels are required, do not perform any calculations
  if (affiliationLevels <= 0) {
    return {
      poissonDisc,
      delaunayVertices: [],
      delaunayTriangles: [],
      voronoiNodes: [],
      affiliationLevelSections: [],
      salientPoints: [],
    };
  }

  // add a special reserved point next to Sol, because the distance to Rigil Kentarus is so small
  const terra = systems.find((system) => system.name === 'Sol');
  const solAffiliation = terra?.eraAffiliations[era.index] || '';

  // voronoi calculation for all affiliation levels
  let voronoiResult: VoronoiResult = performVoronoiCalculations(
    Delaunator,
    cellMode,
    poissonDisc,
    systems,
    [],
    era,
    affiliationLevels,
    solAffiliation,
  );

  // figure out salients (top level only)
  const simpleBorderLoops = generateSimpleBorderLoops(
    voronoiResult.affiliationLevelSections[0].borderSections,
    voronoiResult.delaunayVertices,
  );
  const salientPoints = connectSalients(simpleBorderLoops, voronoiResult.delaunayVertices);
  if (salientPoints.length) {
    // re-run the voronoi calculations with the additional salient points
    voronoiResult = performVoronoiCalculations(
      Delaunator,
      cellMode,
      poissonDisc,
      systems,
      salientPoints,
      era,
      affiliationLevels,
      solAffiliation,
    );
  }

  // entity borders map, by hierarchy level
  const borderLoops: Array<Record<string, Array<BorderEdgeLoop>>> = [];

  // go through each of the hierarchy levels
  voronoiResult.affiliationLevelSections.forEach((hierarchyLevel, hierarchyLevelIndex) => {
    logger.debug('Calculating voronoi borders: Now working on hierarchy level', hierarchyLevelIndex);
    // keep a copy of the original border edges array
    hierarchyLevel.unmodifiedBorderEdges = deepCopy(hierarchyLevel.borderEdges);

    // merge smaller border sections into larger ones
    mergeBorderSections(hierarchyLevel.borderSections, hierarchyLevelIndex);
    // simplify border sections by removing short edges and straightening the edge flow
    // TODO differentiate amount of simplification by hierarchy level?
    simplifyBorderSections(
      hierarchyLevel.borderSections,
      voronoiResult.delaunayVertices,
      hierarchyLevel.threeWayNodes
    );

    // create a map with key = edge id
    const edgeMap: Record<string, VoronoiBorderEdge> = {};
    hierarchyLevel.borderSections.forEach((borderSection) => {
      borderSection.edges.forEach((edge) => edgeMap[edge.id] = edge)
    })

    const borderSectionsForLoops = deepCopy(hierarchyLevel.borderSections);

    // Match sections to parent loop
    if (hierarchyLevelIndex === 0) {
      hierarchyLevel.internalBorderSections = [];
    } else {
      hierarchyLevel.internalBorderSections = hierarchyLevel.borderSections.filter((section) => {
        const parentAffiliation1 = section.affiliation1.split(',').slice(0, hierarchyLevelIndex).join(',');
        const parentAffiliation2 = section.affiliation2.split(',').slice(0, hierarchyLevelIndex).join(',');
        return parentAffiliation1 === parentAffiliation2;
      });
      // logger.debug(Object.values(hierarchyLevel.threeWayNodes));
      connectInternalBorderSections(
        hierarchyLevelIndex,
        hierarchyLevel.internalBorderSections,
        voronoiResult.affiliationLevelSections.map(
          (section) => section.borderLoops || {}
        ),
      );
    }

    // generate control points for each border section separately
    hierarchyLevel.borderSections.forEach((borderSection) => {
      generateEdgeControlPointsForSection(borderSection, hierarchyLevel.threeWayNodes, edgeMap);
    });
    borderSectionsForLoops.forEach((borderSection) => {
      generateEdgeControlPointsForSection(borderSection, hierarchyLevel.threeWayNodes, edgeMap);
    });

    // create edge loops for each entity in this hierarchy level
    hierarchyLevel.borderLoops = generateBorderLoops(borderSectionsForLoops, voronoiResult.delaunayVertices);

    // if the borders in this hierarchy level should be separated, do so
    // TODO only do this if the borders need to be separated
    separateBorderLoops(hierarchyLevel.borderLoops, voronoiResult.delaunayVertices);

    Object.keys(hierarchyLevel.borderLoops).forEach((affiliation) => {
      // we do not need additional higher-level loops, those can be filtered out
      if (affiliation.split(',').length < hierarchyLevelIndex + 1) {
        delete hierarchyLevel.borderLoops![affiliation];
        return;
      }
      hierarchyLevel.borderLoops![affiliation].forEach((loop) => {
        calculateSectionLength(loop);
        (loop as BorderEdgeLoop).isInnerLoop = loop.innerAffiliation !== affiliation;
      });
    });
  });
  // processBorderLoops(borderLoops, vertices, borderSeparation, controlPointTension);

  return {
    ...voronoiResult,
    salientPoints,
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
 * @param affiliationLevels The number of hierarchy levels to generate border sections for
 * @param solAffiliation The affiliation of the sol system in the given era
 */
function performVoronoiCalculations(
  Delaunator: any,
  cellMode: VoronoiCellMode,
  poissonDisc: PoissonDisc<PointWithAffiliation>,
  systems: Array<System>,
  salientPoints: Array<PointWithAffiliation>,
  era: Era,
  affiliationLevels: number,
  solAffiliation: string,
): VoronoiResult {
  poissonDisc.replaceReservedPoints([
    ...systems.map((system) => ({
      id: system.id,
      x: system.x,
      y: system.y,
      affiliation: system.eraAffiliations[era.index],
      //affiliation: extractBorderStateAffiliation(system.eraAffiliations[era.index], undefined, 'ignore', 2),
    })).filter((system) => !IRRELEVANT_AFFILIATIONS.includes(
      extractBorderStateAffiliation(system.affiliation)
    )),
    ...salientPoints,
    {id: 'sol-buffer-point-1', x: 1, y: 3, affiliation: solAffiliation},
    {id: 'sol-buffer-point-2', x: 2.5, y: -1.25, affiliation: solAffiliation},
  ]);

  // filter out points that are irrelevant for drawing the borders, then add an empty adjacency list to each relevant point
  // (top-level affiliations only)
  const delaunayVertices: Array<BorderDelaunayVertex> = poissonDisc.aggregatedPoints
    .filter((poissonPoint) =>  !IRRELEVANT_AFFILIATIONS.includes(
      extractBorderStateAffiliation(poissonPoint.affiliation)
    ))
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
  // for each level of borders that needs to be displayed, generate border edges and assemble them to sections
  const affiliationLevelSections: Array<VoronoiResultHierarchyLevel> = [];
  for (let levels = 0; levels < affiliationLevels; levels++) {
    // process the voronoi nodes and generate border edges for the hierarchy level entities (e.g. factions)
    const { borderEdges, threeWayNodes } = generateBorderEdges(
      voronoiNodes,
      delaunayVertices,
      levels + 1,
    );
    // using the border edges, create border sections
    const borderSections = generateBorderSections(borderEdges);
    // add the section objects for the current affiliation hierarchy level
    affiliationLevelSections.push({
      borderEdges,
      threeWayNodes,
      borderSections,
    });
  }

  return {
    delaunayVertices,
    delaunayTriangles,
    poissonDisc,
    voronoiNodes,
    affiliationLevelSections,
  };
}
