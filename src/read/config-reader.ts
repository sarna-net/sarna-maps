import { readAndParseYamlFile } from './common';
import {
  BorderLabelConfig,
  GeneratorConfig,
  DataSourceConfig,
  GlyphConfig,
  SystemLabelConfig,
  logger
} from '../common';
import {
  GeneratorConfigTi,
  GeneratorConfigMapLayerTi,
  GeneratorConfigOverlayTi,
} from '../common/types';
import { createCheckers } from 'ts-interface-checker';
import path from 'path';

export async function readConfigFiles(fileNames: {
  generatorConfig: string;
  dataSourceConfig: string;
  glyphConfig: string;
  systemLabelConfig: string;
  borderLabelConfig: string;
}) {
  // read and validate generator config
  const generatorConfig = readAndParseYamlFile(
    fileNames.generatorConfig,
    'Generator config',
  );
  const checkers = createCheckers(
    GeneratorConfigTi,
    GeneratorConfigMapLayerTi,
    GeneratorConfigOverlayTi,
  );
  try {
    checkers.GeneratorConfig.check(generatorConfig);
    // TODO check filename pattern for output
  } catch (e) {
    logger.error(
      'config-reader.ts',
      `The generator config at ${fileNames.generatorConfig} is not valid:\n` +
        e.message.replaceAll('value.', '').split('\n').map((line: string) => '  ' + line).join('\n'),
    );
    if (e.message.split('\n').length >= 3) {
      logger.error('config-reader.ts', '  ... (first three errors shown)');
    }
    logger.error('config-reader.ts', 'Please refer to the example configs and the generator config documentation.');
    process.exit(1);
  }
  logger.info(`Generator config at ${fileNames.generatorConfig} read and parsed successfully`);


  // TODO use zod or a similar library to make sure the configuration files are valid
  // src/read/config-reader.ts

  // --- EXISTING: read user data source config ---
  const dataSourceConfig = readAndParseYamlFile(
    fileNames.dataSourceConfig,
    'data source config'
  ) as DataSourceConfig;

  // --- NEW: load global fallback ---
  const globalDataSourceConfigPath = path.resolve(
    process.cwd(),
    'config/global/data-source.config.yaml'
  );

  const globalDataSourceConfig = readAndParseYamlFile(
    globalDataSourceConfigPath,
    'global data source config'
  ) as DataSourceConfig;

  function isValidLocalFileConfig(config: any): boolean {
  return (
    config !== undefined &&
    config !== null &&
    typeof config === 'object' &&
    Object.keys(config).length > 0
  );
  }

  //logger.debug('dataSourceConfig.localFileConfig:', dataSourceConfig.localFileConfig);
  //logger.debug('generatorConfig.localFileConfig:', generatorConfig?.localFileConfig);
  //logger.debug('globalDataSourceConfig.localFileConfig:', globalDataSourceConfig.localFileConfig);
  //const dataSourceHasLocal = isValidLocalFileConfig(dataSourceConfig.localFileConfig);
  const generatorHasLocal = isValidLocalFileConfig(generatorConfig?.localFileConfig);
  const globalHasLocal = isValidLocalFileConfig(globalDataSourceConfig.localFileConfig);

  //if (!dataSourceHasLocal) {
    if (generatorHasLocal) {
      dataSourceConfig.localFileConfig = generatorConfig.localFileConfig;
      logger.info(`Using localFileConfig from generatorConfig`);
    } else if (globalHasLocal) {
      dataSourceConfig.localFileConfig = globalDataSourceConfig.localFileConfig;
      logger.info('Using fallback localFileConfig from global data-source.config.yaml');
    } else {
      throw new Error(
        'localFileConfig not found in dataSourceConfig, generatorConfig, or global config'
      );
    }
  //}

  const glyphConfig = readAndParseYamlFile(
    fileNames.glyphConfig,
    'glyph config',
  ) as Partial<GlyphConfig>;
  if (!glyphConfig || !glyphConfig.regular || !glyphConfig.small) {
    throw new Error('Glyph configuration missing or incomplete');
  }
  glyphConfig.borderLabels = {
    ...glyphConfig.regular,
    ...glyphConfig.borderLabels,
  };

  const systemLabelConfig = readAndParseYamlFile(
    fileNames.systemLabelConfig,
    'system label config',
  ) as Partial<SystemLabelConfig>;
  if (!systemLabelConfig || !systemLabelConfig.padding || !systemLabelConfig.margins) {
    throw new Error('System label configuration missing or incomplete');
  }

  const borderLabelConfig = readAndParseYamlFile(
    fileNames.borderLabelConfig,
    'border label config',
  ) as Partial<BorderLabelConfig>;
  if (!borderLabelConfig) {
    throw new Error('Border label configuration missing or incomplete');
  }
  // TODO validate properly
  borderLabelConfig.rules = {
    ...{
      labelDistanceToBorder: 1,
      distanceBetweenCandidates: 1,
      borderIntersectionTolerance: 1,
      maxBorderIntersectionDistance: 1,
      minLoopDistanceBetweenLabels: 1,
      minDistanceBetweenLabels: 1,
      maxLabelOverlapArea: 1,
      cornerDistanceFactor: 1,
      minViableScore: 1,
      minGoodScore: 1,
      regionLabelBorderOverlapThreshold: 2,
    },
    ...(borderLabelConfig.rules || {}),
  };
  borderLabelConfig.scoreWeights = {
    ...{
      labelOverlap: 1,
      borderIntersection: 1,
      angle: 1,
      centeredness: 1,
      cornerScore: 1,
      multiline: 1,
      straightness: 1,
    },
    ...(borderLabelConfig.scoreWeights || {}),
  };
  borderLabelConfig.manualConfigs = borderLabelConfig.manualConfigs || {};

  return {
    generatorConfig: generatorConfig as GeneratorConfig,
    dataSourceConfig: dataSourceConfig as DataSourceConfig,
    glyphConfig: glyphConfig as GlyphConfig,
    systemLabelConfig: systemLabelConfig as SystemLabelConfig,
    borderLabelConfig: borderLabelConfig as BorderLabelConfig,
  };
}
