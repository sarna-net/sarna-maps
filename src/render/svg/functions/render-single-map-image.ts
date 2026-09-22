import {
  BorderLabelConfig,
  Era, Faction,
  GeneratorConfig, GeneratorConfigMapLayerDynamicSize, GeneratorConfigMapLayerFixedSize, getMapBounds,
  GlyphConfig,
  System,
  SystemLabelConfig,
  TextTemplate
} from '../../../common';
import path from 'path';
import { renderMapLayer } from './render-map-layer';
import { renderMapOverlay } from './render-map-overlay';
import { VoronoiResult, VoronoiResultHierarchyLevel } from '../../../compute';

/**
 * @param generatorConfig
 * @param globalConfigs
 * @param era
 * @param factionMap
 * @param affiliationLevelSections
 * @param systems
 * @param focusedSystem
 * @param debugObjects Objects used for visual debugging
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

  // determine dimensions for dynamic-sized maps
  const dimensions = { ...generatorConfig.dimensions };
  const firstMapLayerConfig = generatorConfig.mapLayers.length ? generatorConfig.mapLayers[0] : null;
  let fixedSizeFirstMapLayerConfig: GeneratorConfigMapLayerFixedSize;
  if ((firstMapLayerConfig as GeneratorConfigMapLayerDynamicSize)?.framedFactions) {
    let factionIds: string[];
    const typedLayer = firstMapLayerConfig as GeneratorConfigMapLayerDynamicSize;
    if (Array.isArray(typedLayer?.framedFactions)) {
      factionIds = typedLayer?.framedFactions as string[];
    } else {
      factionIds = [typedLayer?.framedFactions as string];
    }
    const padding = typedLayer?.padding
      ? isNaN(typedLayer.padding as number)
        ? typedLayer.padding as { x: number; y: number; }
        : { x: typedLayer.padding as number, y: typedLayer.padding as number }
      : { x: 0, y: 0 };
    const mapBounds = getMapBounds(
      era,
      systems,
      factionIds,
      padding,
    );
    const mapUnitDimensions = {
      width: mapBounds.maxX - mapBounds.minX,
      height: mapBounds.maxY - mapBounds.minY,
    };
    const focus = {
      point: {
        x: mapBounds.minX + mapUnitDimensions.width * 0.5,
        y: mapBounds.minY + mapUnitDimensions.height * 0.5,
      },
    };
    dimensions.width = Math.max(dimensions.width, mapUnitDimensions.width * (typedLayer.pixelsPerMapUnit || 1));
    dimensions.height = Math.max(dimensions.height, mapUnitDimensions.height * (typedLayer.pixelsPerMapUnit || 1));
    fixedSizeFirstMapLayerConfig = {
      ...typedLayer,
      mapUnitDimensions,
      focus,
    };
  } else {
    fixedSizeFirstMapLayerConfig = firstMapLayerConfig as GeneratorConfigMapLayerFixedSize;
  }


  // generate code for all map sections and all overlays
  const elements: Array<{ defs: string; css: string; markup: string; }> = [];
  elements.push(
    ...(generatorConfig.mapLayers || []).map((mapLayerConfig, index) =>
      renderMapLayer(
        theme,
        dimensions, // generatorConfig.dimensions,
        (index === 0 ? fixedSizeFirstMapLayerConfig : mapLayerConfig) as GeneratorConfigMapLayerFixedSize,
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
    width: dimensions.width, //generatorConfig.dimensions.width,
    height: dimensions.height, //generatorConfig.dimensions.height,
    defs: elements.map((element) => element.defs).join('\n'),
    css: elements.map((element) => element.css).join('\n'),
    elements: elements.map((element) => element.markup).join('\n'),
  });
}
