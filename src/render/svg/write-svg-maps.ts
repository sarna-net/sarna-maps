import { Era, GeneratorConfig, System } from '../../common';
import { determineOutputFilePath, renderSingleMapImage } from './functions';
import path from 'path';
import fs from 'fs';

export function writeSvgMaps(generatorConfig: GeneratorConfig, eras: Array<Era>, systems: Array<System>) {

  const erasToIterateOver = eras.filter((era) =>
    !generatorConfig.eras || generatorConfig.eras.length === 0 || generatorConfig.eras.includes(era.index)
  );

  let objectsToIterateOver: Array<System> | null = null;
  if (generatorConfig.iterateObjects?.type === 'system') {
    const patternRegExp = new RegExp(generatorConfig.iterateObjects?.pattern || '.+', 'i');
    objectsToIterateOver = systems.filter((system) => system.fullName.match(patternRegExp));
  }

  erasToIterateOver.forEach((era) => {
    if (objectsToIterateOver && objectsToIterateOver.length > 0) {
      // iterate over all matched systems for each era
      objectsToIterateOver.forEach((system, systemIndex) => {
        generateAndSaveSingleMapImage(generatorConfig, era, system, systemIndex);
      });
    } else if (objectsToIterateOver) {
      console.warn(`Pattern "${generatorConfig.iterateObjects?.pattern}" does not match any systems. No map images will be created.`);
    } else {
      // no objects to iterate over - create just one map image per era
      generateAndSaveSingleMapImage(generatorConfig, era);
    }
  });
}

/**
 * Helper function that first creates and then saves a single map image to the file location determined
 * by the generator config.
 *
 * @param config The generator configuration
 * @param era The selected era for the map image
 * @param system The focused system for the map image, if applicable
 * @param systemIndex The focused system's index, if applicable
 */
function generateAndSaveSingleMapImage(config: GeneratorConfig, era: Era, system?: System, systemIndex?: number) {
  const filePath = determineOutputFilePath(
    config.fileOutput.directory,
    config.fileOutput.fileNamePattern,
    era,
    system,
    systemIndex,
  );

  const content = renderSingleMapImage(config, era, system);

  console.info(`Now attempting to write file "${filePath}"`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
  console.info(`Wrote file "${filePath}".`);
}
