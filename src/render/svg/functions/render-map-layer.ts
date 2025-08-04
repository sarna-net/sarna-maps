import {
  BorderLabelConfig,
  Dimensions2d,
  Era, Faction,
  GeneratorConfigMapLayer,
  GlyphConfig,
  Point2d, RectangleGrid,
  System,
  SystemLabelConfig, TextTemplate
} from '../../../common';
import { restrictSystemsToViewbox } from '../../../compute/restrict-objects-to-viewbox';
import { BorderEdgeLoop, placeBorderLabels, placeSystemLabels } from '../../../compute';
import {
  restrictBorderLoopsToViewbox
} from '../../../compute/restrict-objects-to-viewbox/functions/restrict-border-loops-to-viewbox';
import { renderBorderLoops } from './render-border-loops';
import { renderSystems } from './render-systems';
import { renderSystemLabels } from './render-system-labels';
import { renderBorderLabels } from './render-border-labels';
import path from 'path';
import { renderJumpRings } from './render-jump-rings';

/**
 * Render a single configured map section
 *
 * @param imageDimensions The parent map image dimensions
 * @param mapLayerConfig The configuration object for this map layer
 * @param globalConfigs The global configuration objects
 * @param era The selected era for this image
 * @param factionMap The map of factions (factionId -> faction object)
 * @param borderLoops The map of all border loops (factionId -> list of border loops for this faction)
 * @param systems The list of all systems
 * @param focusedSystem The focused system for this map section, if any
 */
export function renderMapLayer(
  imageDimensions: Dimensions2d,
  mapLayerConfig: GeneratorConfigMapLayer,
  globalConfigs: {
    glyphConfig: GlyphConfig;
    systemLabelConfig: SystemLabelConfig;
    borderLabelConfig: BorderLabelConfig;
  },
  era: Era,
  factionMap: Record<string, Faction>,
  borderLoops: Record<string, Array<BorderEdgeLoop>>,
  systems: Array<System>,
  focusedSystem?: System,
) {
  // PHASE 1: PREPARE ALL NECESSARY DATA
  const pixelDimensions = mapLayerConfig.dimensions || imageDimensions;
  // TODO what about height?
  const zoomFactor = pixelDimensions.width / mapLayerConfig.mapUnitDimensions.width;

  // determine map section focus (= central) point, in map coordinates
  const focusPoint: Point2d =
    mapLayerConfig.focus?.point === 'system' && focusedSystem
      ? { x: focusedSystem.x, y: focusedSystem.y }
      : (mapLayerConfig.focus?.point as Point2d) || { x: 0, y: 0 };
  // add configured delta
  // if (mapLayerConfig.focus?.delta) {
  //   focusPoint.x += mapLayerConfig.focus.delta.x;
  //   focusPoint.y -= mapLayerConfig.focus.delta.y;
  // }

  // calculate the visible map section
  const visibleViewRect = {
    anchor: {
      x: focusPoint.x - (mapLayerConfig.focus?.delta?.x || 0) - mapLayerConfig.mapUnitDimensions.width * 0.5,
      y: focusPoint.y - (mapLayerConfig.focus?.delta?.y || 0) - mapLayerConfig.mapUnitDimensions.height * 0.5,
    },
    dimensions: mapLayerConfig.mapUnitDimensions,
  };

  let transform = `scale(${zoomFactor.toFixed(6)}) ` +
    `translate(${(-focusPoint.x + (mapLayerConfig.focus?.delta?.x || 0) + mapLayerConfig.mapUnitDimensions.width * 0.5).toFixed(3)}px,` +
    `${(focusPoint.y - (mapLayerConfig.focus?.delta?.y || 0) + mapLayerConfig.mapUnitDimensions.height * 0.5).toFixed(3)}px)`;
  if (mapLayerConfig.position) {
    transform = `translate(${mapLayerConfig.position.x}px,${mapLayerConfig.position.y}px) ${transform}`;
  }

  const visibleSystems = mapLayerConfig.elements.systems || mapLayerConfig.elements.systemLabels
    ? restrictSystemsToViewbox(visibleViewRect, systems)
    : [];

  // Create a rectangle grid that will let us check for label collisions
  const labelGrid = new RectangleGrid(visibleViewRect);

  // Place system labels
  const systemLabels = mapLayerConfig.elements.systemLabels
    ? placeSystemLabels(
        visibleViewRect,
        era.index,
        visibleSystems,
        labelGrid,
        globalConfigs.glyphConfig,
        globalConfigs.systemLabelConfig,
      )
    : [];

  // Limit border loops to the visible section of the map
  const boundedLoops = !!mapLayerConfig.elements.factions
    ? restrictBorderLoopsToViewbox(
        borderLoops || {},
        visibleViewRect,
        15, // TODO put this in a config file
      )
    : {};

  // Place border labels
  const borderLabels = mapLayerConfig.elements.borderLabels
    ? placeBorderLabels(
        visibleViewRect,
        era.index,
        factionMap,
        borderLoops || {},
        labelGrid,
        globalConfigs.glyphConfig,
        globalConfigs.borderLabelConfig,
      )
    : { candidatesByFaction: {} };

  // PHASE 2: RENDER ELEMENTS
  const layerCssClass = mapLayerConfig.name.replace(/\s+/g, '-');

  const { defs: factionDefs, css: factionCss, markup: factionMarkup } = mapLayerConfig.elements.factions
    ? renderBorderLoops(boundedLoops, factionMap, mapLayerConfig.elements.factions.curveBorderEdges, layerCssClass)
    : { defs: '', css: '', markup: '' };

  const { defs: borderLabelDefs, css: borderLabelCss, markup: borderLabelMarkup } = mapLayerConfig.elements.borderLabels
    ? renderBorderLabels(borderLabels, factionMap, layerCssClass)
    : { defs: '', css: '', markup: '' };

  const { defs: jumpRingDefs, css: jumpRingCss, markup: jumpRingMarkup } = mapLayerConfig.elements.jumpRings
    ? renderJumpRings(mapLayerConfig, focusPoint, layerCssClass)
    : { defs: '', css: '', markup: '' };

  const { defs: systemDefs, css: systemCss, markup: systemMarkup } = mapLayerConfig.elements.systems
    ? renderSystems(visibleSystems, factionMap, era.index, layerCssClass)
    : { defs: '', css: '', markup: '' };

  const { css: systemLabelCss, markup: systemLabelMarkup } = mapLayerConfig.elements.systemLabels
    ? renderSystemLabels(systemLabels, layerCssClass)
    : { css: '', markup: '' };

  // PHASE 3: Assemble and return result
  const templatePath = path.join(__dirname, '../templates');
  const layerTemplate = new TextTemplate('map-section.svg.tpl', templatePath);
  const defsTemplate = new TextTemplate('map-section-def.svg.tpl', templatePath);
  const cssTemplate = new TextTemplate('map-section.css.tpl', templatePath);
  const mapSectionCss = cssTemplate.replace({
    css_class: layerCssClass,
  });
  const mapSectionDef = defsTemplate.replace({
    id: layerCssClass + '-clip-path',
    x: visibleViewRect.anchor.x.toFixed(3),
    y: (-focusPoint.y + (mapLayerConfig.focus?.delta?.y || 0) - mapLayerConfig.mapUnitDimensions.height * 0.5).toFixed(3),
    width: visibleViewRect.dimensions.width,
    height: visibleViewRect.dimensions.height,
  });

  const markup = [factionMarkup, borderLabelMarkup, jumpRingMarkup, systemMarkup, systemLabelMarkup]
    .filter((code) => !!code.trim())
    .join('\n');
  if (markup) {
    return {
      defs: [mapSectionDef, factionDefs, borderLabelDefs, jumpRingDefs, systemDefs]
        .filter((code) => !!code.trim())
        .join('\n'),
      css: [mapSectionCss, factionCss, borderLabelCss, jumpRingCss, systemCss, systemLabelCss]
        .filter((code) => !!code.trim())
        .join('\n'),
      markup: layerTemplate.replace({
        name: mapLayerConfig.name,
        css_class: layerCssClass,
        // TODO make this into its own rect
        x: visibleViewRect.anchor.x.toFixed(3),
        y: (-focusPoint.y + (mapLayerConfig.focus?.delta?.y || 0) - mapLayerConfig.mapUnitDimensions.height * 0.5).toFixed(3),
        width: visibleViewRect.dimensions.width,
        height: visibleViewRect.dimensions.height,
        transform,
        content: markup,
        clip_path_id: layerCssClass + '-clip-path',
      }),
    };
  } else {
    return {
      defs: '',
      css: '',
      markup: '',
    };
  }
}
