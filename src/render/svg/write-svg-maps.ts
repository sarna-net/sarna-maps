import {
  BorderLabelConfig,
  Era,
  Faction,
  GeneratorConfig,
  GlyphConfig,
  logger,
  System,
  SystemLabelConfig
} from '../../common';
import { determineOutputFilePath, renderSingleMapImage } from './functions';
import path from 'path';
import fs from 'fs';
import { UNIVERSE_RECT } from '../../Constants';
import {
  BorderEdgeLoop,
  calculateVoronoiBorders,
  SalientPoint,
  VoronoiResult,
  VoronoiResultHierarchyLevel
} from '../../compute';

export async function writeSvgMaps(
  generatorConfig: GeneratorConfig,
  glyphConfig: GlyphConfig,
  systemLabelConfig: SystemLabelConfig,
  borderLabelConfig: BorderLabelConfig,
  eras: Array<Era>,
  factionMap: Record<string, Faction>,
  systems: Array<System>,
) {
  const globalConfigs = {
    glyphConfig,
    systemLabelConfig,
    borderLabelConfig,
  };

  const erasToIterateOver = eras.filter((era) =>
    !generatorConfig.eras || generatorConfig.eras.length === 0 || generatorConfig.eras.includes(era.index)
  );

  let objectsToIterateOver: Array<System> | null = null;
  if (generatorConfig.iterateObjects?.type === 'system') {
    const patternRegExp = new RegExp(generatorConfig.iterateObjects?.pattern || '.+', 'i');
    objectsToIterateOver = systems.filter((system) => system.fullName.match(patternRegExp));
  }

  for (let eraI = 0; eraI < erasToIterateOver.length; eraI++) {
    const era = erasToIterateOver[eraI];
    logger.info(`Now generating maps for era #${era.index}: "${era.year} ${era.name}" ...`);

    // TODO put these settings into a config file
    const poissonSettings = {
      origin: UNIVERSE_RECT.anchor,
      dimensions: UNIVERSE_RECT.dimensions,
      radius: 30,
      maxSamples: 30,
      seed: 'sarna',
    }

    // Perform voronoi border calculations
    const {
      // poissonDisc,
      // delaunayTriangles,
      // delaunayVertices,
      // voronoiNodes,
      // unmodifiedBorderEdges,
      // borderEdges,
      // borderSections,
      affiliationLevelSections,
      // threeWayNodes,
      salientPoints,
    } = await calculateVoronoiBorders(
      systems,
      era,
      poissonSettings,
      // for the number of hierarchy levels to calculate, get the maximum displayed levels of all configured map layers
      Math.max(
        ...generatorConfig.mapLayers.map((layer) => layer.elements.borders?.length || 0)
      ),
    );

    if (objectsToIterateOver && objectsToIterateOver.length > 0) {
      // iterate over all matched systems for each era
      objectsToIterateOver.forEach((system, systemIndex) => {
        generateAndSaveSingleMapImage(
          generatorConfig,
          globalConfigs,
          era,
          factionMap,
          affiliationLevelSections || [],
          systems,
          system,
          systemIndex,
          {
            salientPoints,
          },
        );
      });
    } else if (objectsToIterateOver) {
      logger.warn(`Pattern "${generatorConfig.iterateObjects?.pattern}" does not match any systems. No map images will be created.`);
    } else {
      // no objects to iterate over - create just one map image per era
      generateAndSaveSingleMapImage(
        generatorConfig,
        globalConfigs,
        era,
        factionMap,
        affiliationLevelSections || [],
        systems,
        undefined,
        undefined,
        {
          salientPoints,
        },
      );
    }
  }
}

/**
 * Helper function that first creates and then saves a single map image to the file location determined
 * by the generator config.
 *
 * @param config The generator configuration
 * @param globalConfigs The globally defined configuration objects
 * @param era The selected era for the map image
 * @param factionMap The map of all factions
 * @param affiliationLevelSections The border result sections for each hierarchy
 // * @param borderLoops The map of all border loops, by faction
 * @param systems The list of all systems
 * @param focusedSystem The focused system for the map image, if applicable
 * @param focusedSystemIndex The focused system's index, if applicable
 * @param debugObjects Objects used for virtual debugging
 */
function generateAndSaveSingleMapImage(
  config: GeneratorConfig,
  globalConfigs: {
    glyphConfig: GlyphConfig;
    systemLabelConfig: SystemLabelConfig;
    borderLabelConfig: BorderLabelConfig;
  },
  era: Era,
  factionMap: Record<string, Faction>,
  affiliationLevelSections: Array<VoronoiResultHierarchyLevel>,
  systems: Array<System>,
  focusedSystem?: System,
  focusedSystemIndex?: number,
  debugObjects?: Partial<VoronoiResult>,
) {
  const filePath = determineOutputFilePath(
    config.fileOutput.directory,
    config.fileOutput.fileNamePattern,
    era,
    focusedSystem,
    focusedSystemIndex,
  );

  const content = renderSingleMapImage(
    config,
    globalConfigs,
    era,
    factionMap,
    affiliationLevelSections,
    systems,
    focusedSystem,
    debugObjects,
  );

  logger.info(`Now attempting to write file "${filePath}"`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
  logger.info(`Wrote file "${filePath}".`);
}
