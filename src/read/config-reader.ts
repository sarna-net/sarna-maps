import { readAndParseYamlFile } from './common';
import { BorderLabelConfig, GlyphConfig, SystemLabelConfig } from '../common';

export async function readConfigFiles(fileNames: {
  glyphConfig: string;
  systemLabelConfig: string;
  borderLabelConfig: string;
}) {
  // TODO use zod or a similar library to make sure the configuration files are valid
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
      multiline: 1,
      straightness: 1,
    },
    ...(borderLabelConfig.scoreWeights || {}),
  };
  borderLabelConfig.manualConfigs = borderLabelConfig.manualConfigs || {};

  return {
    glyphConfig: glyphConfig as GlyphConfig,
    systemLabelConfig: systemLabelConfig as SystemLabelConfig,
    borderLabelConfig: borderLabelConfig as BorderLabelConfig,
  };
}
