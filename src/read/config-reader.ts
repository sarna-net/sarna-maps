import { readAndParseYamlFile } from './common';
import { BorderLabelConfig, GeneratorConfig, DataSourceConfig, GlyphConfig, SystemLabelConfig } from '../common';
import {
  GeneratorConfigTi,
  GeneratorConfigMapLayerTi,
  GeneratorConfigOverlayTi,
} from '../common/types';
import { createCheckers } from 'ts-interface-checker';

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
    console.error(
      `The generator config at ${fileNames.generatorConfig} is not valid:\n` +
        e.message.replaceAll('value.', '').split('\n').map((line: string) => '  ' + line).join('\n'),
    );
    if (e.message.split('\n').length >= 3) {
      console.error('  ... (first three errors shown)');
    }
    console.error('Please refer to the example configs and the generator config documentation.');
    process.exit(1);
  }
  console.info(`Generator config at ${fileNames.generatorConfig} read and parsed successfully`);


  // TODO use zod or a similar library to make sure the configuration files are valid
  const dataSourceConfig = readAndParseYamlFile(
    fileNames.dataSourceConfig,
    'data source config',
  ) as DataSourceConfig;
  if (!dataSourceConfig) {
    throw new Error('Data source configuration missing or incomplete');
  }

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
