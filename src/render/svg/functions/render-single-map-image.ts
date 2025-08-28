import {
  BorderLabelConfig,
  Era, Faction,
  GeneratorConfig,
  GlyphConfig,
  System,
  SystemLabelConfig,
  TextTemplate
} from '../../../common';
import path from 'path';
import { renderMapLayer } from './render-map-layer';
import { renderMapOverlay } from './render-map-overlay';
import { BorderEdgeLoop, SalientPoint, VoronoiResult, VoronoiResultHierarchyLevel } from '../../../compute';

/**
 * @param generatorConfig
 * @param globalConfigs
 * @param era
 * @param factionMap
 * @param affiliationLevelSections
 * @param systems
 * @param focusedSystem
 * @param debugObjects Objects used for virtual debugging
 */
export function renderSingleMapImage(
  generatorConfig: GeneratorConfig,
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
  debugObjects?: Partial<VoronoiResult>,
) {
  const theme = generatorConfig.theme || 'light';
  const templatePath = path.join(__dirname, '../templates/', theme);
  const docTemplate = new TextTemplate('map-base.svg.tpl', templatePath);

  // generate code for all map sections and all overlays
  const elements: Array<{ defs: string; css: string; markup: string; }> = [];
  elements.push(
    ...(generatorConfig.mapLayers || []).map((mapLayerConfig) =>
      renderMapLayer(
        theme,
        generatorConfig.dimensions,
        mapLayerConfig,
        globalConfigs,
        era,
        factionMap,
        affiliationLevelSections,
        systems,
        focusedSystem,
        !!generatorConfig.debugMode ? debugObjects : undefined,
      ),
    ),
    ...(generatorConfig.overlays || []).map((overlay) =>
      renderMapOverlay(overlay, theme, era, focusedSystem)
    ),
  );

  return docTemplate.replace({
    width: generatorConfig.dimensions.width,
    height: generatorConfig.dimensions.height,
    defs: elements.map((element) => element.defs).join('\n'),
    css: elements.map((element) => element.css).join('\n'),
    elements: elements.map((element) => element.markup).join('\n'),
  });
}
