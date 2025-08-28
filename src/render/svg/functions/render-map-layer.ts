import path from 'path';
import {
  BorderLabelConfig,
  Dimensions2d,
  Era, Faction,
  GeneratorConfigMapLayer,
  GlyphConfig, logger,
  Point2d, RectangleGrid,
  System,
  SystemLabelConfig, TextTemplate
} from '../../../common';
import { restrictSystemsToViewbox } from '../../../compute/restrict-objects-to-viewbox';
import {
  BorderEdgeLoop,
  placeBorderLabels,
  placeSystemLabels,
  VoronoiResult,
  VoronoiResultHierarchyLevel
} from '../../../compute';
import {
  restrictBorderLoopsToViewbox
} from '../../../compute/restrict-objects-to-viewbox/functions/restrict-border-loops-to-viewbox';
import { renderBorderLoops } from './render-border-loops';
import { renderSystems } from './render-systems';
import { renderSystemLabels } from './render-system-labels';
import { renderBorderLabels } from './render-border-labels';
import { renderJumpRings } from './render-jump-rings';
import { renderDirectionalIndicators } from './render-directional-indicators';
import { generateConnectionLines } from '../../../compute/connection-lines';
import { renderConnectionLines } from './render-connection-lines';
import { renderSalients } from './render-salients';
import { renderRegionalBorders } from './render-regional-borders';

/**
 * Render a single configured map section
 *
 * @param theme The render color theme
 * @param imageDimensions The parent map image dimensions
 * @param mapLayerConfig The configuration object for this map layer
 * @param globalConfigs The global configuration objects
 * @param era The selected era for this image
 * @param factionMap The map of factions (factionId -> faction object)
 * @param affiliationLevelSections The border information in an array (by hierarchy level)
 // * @param borderLoops Array with hierarchy levels of maps (by faction / affiliation key) of all border loops
 * @param systems The list of all systems
 * @param focusedSystem The focused system for this map section, if any
 * @param debugObjects Objects used for virtual debugging
 */
export function renderMapLayer(
  theme: 'light' | 'dark',
  imageDimensions: Dimensions2d,
  mapLayerConfig: GeneratorConfigMapLayer,
  globalConfigs: {
    glyphConfig: GlyphConfig;
    systemLabelConfig: SystemLabelConfig;
    borderLabelConfig: BorderLabelConfig;
  },
  era: Era,
  factionMap: Record<string, Faction>,
  affiliationLevelSections: Array<VoronoiResultHierarchyLevel>,
  // borderLoops: Array<Record<string, Array<BorderEdgeLoop>>>,
  systems: Array<System>,
  focusedSystem?: System,
  debugObjects?: Partial<VoronoiResult>,
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

  // calculate the visible map section
  const visibleViewRect = {
    anchor: {
      x: focusPoint.x - (mapLayerConfig.focus?.delta?.x || 0) - mapLayerConfig.mapUnitDimensions.width * 0.5,
      y: focusPoint.y - (mapLayerConfig.focus?.delta?.y || 0) - mapLayerConfig.mapUnitDimensions.height * 0.5,
    },
    dimensions: mapLayerConfig.mapUnitDimensions,
  };

  let transform = `scale(${zoomFactor.toFixed(6)}) ` +
    `translate(${(-focusPoint.x + (mapLayerConfig.focus?.delta?.x || 0) + mapLayerConfig.mapUnitDimensions.width * 0.5).toFixed(3)},` +
    `${(focusPoint.y - (mapLayerConfig.focus?.delta?.y || 0) + mapLayerConfig.mapUnitDimensions.height * 0.5).toFixed(3)})`;
  if (mapLayerConfig.position) {
    transform = `translate(${mapLayerConfig.position.x},${mapLayerConfig.position.y}) ${transform}`;
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

  const connectionLines = !!mapLayerConfig.elements.connectionLines
    ? generateConnectionLines(
      systems,
      visibleViewRect,
      mapLayerConfig.elements.connectionLines.minimumDistance,
      mapLayerConfig.elements.connectionLines.maximumDistance
    ) : [];

  // Limit internal border sections to the visible section of the map
  // TODO implement simple bounding algorithm
  const boundedInternalBorders = !!mapLayerConfig.elements.borders
    ? affiliationLevelSections.map((levelSection) =>
      levelSection.internalBorderSections || []
    )
    : [];

  // Limit border loops to the visible section of the map
  const boundedBorderLoops = !!mapLayerConfig.elements.borders
    ? affiliationLevelSections.map((levelSection) =>
      restrictBorderLoopsToViewbox(levelSection.borderLoops || {}, visibleViewRect, 15)
    )
    : [];
    //
    // restrictBorderLoopsToViewbox(
    //     affiliationLevelSections.length ? affiliationLevelSections[0].borderLoops || {} : {}, // TODO differentiate hierarchy levels
    //     visibleViewRect,
    //     15, // TODO put this in a config file
    //   )
    // : {};

  // Place border labels TODO enable for lower hierarchy levels
  const borderLabels = (mapLayerConfig.elements.borders?.length || 0) >= 1
    ? placeBorderLabels(
        visibleViewRect,
        era.index,
        factionMap,
        affiliationLevelSections.length ? affiliationLevelSections[0].borderLoops || {} : {},
        labelGrid,
        globalConfigs.glyphConfig,
        globalConfigs.borderLabelConfig,
      )
    : { candidatesByFaction: {} };

  // PHASE 2: RENDER ELEMENTS
  const layerCssClass = mapLayerConfig.name.replace(/\s+/g, '-');

  // TODO enable for lower hierarchy levels, specifically figure out how to manage fill colors
  let factionDefs = '';
  let factionCss = '';
  let factionMarkup = '';
  mapLayerConfig.elements.borders?.forEach((bordersConfig, levelIndex) => {
    if (bordersConfig.display === 'factions') {
      if (boundedBorderLoops.length < levelIndex + 1) {
        logger.warn(`Cannot generate output for map layer "${mapLayerConfig.name}": No bounded border loops for level ${levelIndex}`);
        return;
      }
      const { defs, css, markup } = renderBorderLoops(
        boundedBorderLoops[levelIndex],
        factionMap, // controls fill colors
        theme,
        bordersConfig.curveBorderEdges,
        layerCssClass
      );
      factionDefs += defs + '\n';
      factionCss += css + '\n';
      factionMarkup += markup + '\n';
    } else if (bordersConfig.display === 'regions') {
      const { css, markup } = renderRegionalBorders(
        // affiliationLevelSections[levelIndex].borderSections,
        levelIndex,
        boundedInternalBorders[levelIndex],
        factionMap,
        theme,
        bordersConfig.curveBorderEdges,
      );
      factionCss += css + '\n';
      factionMarkup += markup + '\n';
    }
  });
  // const { defs: factionDefs, css: factionCss, markup: factionMarkup } =
  //   mapLayerConfig.elements.borders?.length && mapLayerConfig.elements.borders[0].display
  //     ? renderBorderLoops(boundedBorderLoops, factionMap, theme, mapLayerConfig.elements.borders[0].curveBorderEdges, layerCssClass)
  //     : { defs: '', css: '', markup: '' };

  // TODO enable for lower hierarchy levels
  const { defs: borderLabelDefs, css: borderLabelCss, markup: borderLabelMarkup } =
    mapLayerConfig.elements.borders?.length && mapLayerConfig.elements.borders[0].borderLabels
      ? renderBorderLabels(borderLabels, factionMap, theme, layerCssClass, zoomFactor)
      : { defs: '', css: '', markup: '' };

  const { defs: jumpRingDefs, css: jumpRingCss, markup: jumpRingMarkup } = mapLayerConfig.elements.jumpRings
    ? renderJumpRings(mapLayerConfig, focusPoint, theme, layerCssClass)
    : { defs: '', css: '', markup: '' };

  const { defs: connectionLineDefs, css: connectionLineCss, markup: connectionLineMarkup } =
    mapLayerConfig.elements.connectionLines
      ? renderConnectionLines(connectionLines, theme)
      : { defs: '', css: '', markup: '' };

  const { defs: systemDefs, css: systemCss, markup: systemMarkup } = mapLayerConfig.elements.systems
    ? renderSystems(visibleSystems, factionMap, theme, era.index, layerCssClass)
    : { defs: '', css: '', markup: '' };

  const { css: systemLabelCss, markup: systemLabelMarkup } = mapLayerConfig.elements.systemLabels
    ? renderSystemLabels(systemLabels, theme, layerCssClass, zoomFactor)
    : { css: '', markup: '' };

  const { css: directionalIndicatorsCss, markup: directionalIndicatorsMarkup } =
    renderDirectionalIndicators(
      globalConfigs.glyphConfig,
      visibleViewRect,
      mapLayerConfig.elements.directionalIndicators || [],
      theme,
      layerCssClass,
    );

  let debugDefs = '';
  let debugCss = '';
  let debugMarkup = '';
  if (debugObjects) {
    const { css: salientsCss, markup: salientsMarkup } =
      renderSalients(
        debugObjects.salientPoints || [],
        theme,
      );
    const regionalBorderSectionsCss = '';
    const regionalBorderSectionsMarkup = '';
    // const { css: regionalBorderSectionsCss, markup: regionalBorderSectionsMarkup } =
    //   renderBorderSections(
    //     debugObjects.regionalBorderSections || [],
    //     theme,
    //   );
    debugCss = [salientsCss, regionalBorderSectionsCss].join('\n');
    debugMarkup = [salientsMarkup, regionalBorderSectionsMarkup].join('\n');
  }

  // PHASE 3: Assemble and return result
  const templatePath = path.join(__dirname, '../templates/', theme);
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

  const markup = [
    factionMarkup,
    borderLabelMarkup,
    jumpRingMarkup,
    connectionLineMarkup,
    systemMarkup,
    systemLabelMarkup,
    directionalIndicatorsMarkup,
    debugMarkup,
  ]
    .filter((code) => !!code.trim())
    .join('\n');
  if (markup) {
    return {
      defs: [mapSectionDef, factionDefs, borderLabelDefs, jumpRingDefs, systemDefs, debugDefs]
        .filter((code) => !!code.trim())
        .join('\n'),
      css: [
        mapSectionCss,
        factionCss,
        borderLabelCss,
        jumpRingCss,
        systemCss,
        connectionLineCss,
        systemLabelCss,
        directionalIndicatorsCss,
        debugCss,
      ]
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
