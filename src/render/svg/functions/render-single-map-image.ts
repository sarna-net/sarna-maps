import { Era, GeneratorConfig, System, TextTemplate } from '../../../common';
import path from 'path';
import { renderMapLayer } from './render-map-layer';
import { renderMapOverlay } from './render-map-overlay';

export function renderSingleMapImage(generatorConfig: GeneratorConfig, era: Era, system?: System) {
  const docTemplate = new TextTemplate('map-base-new.svg.tpl', path.join(__dirname, '../templates'));

  const mapLayersSvg = (generatorConfig.mapLayers || []).map((mapLayer) => renderMapLayer(mapLayer, era, system));
  const overlaysSvg = (generatorConfig.overlays || []).map((overlay) => renderMapOverlay(overlay, era, system));

  return docTemplate.replace({
    width: generatorConfig.dimensions.width,
    height: generatorConfig.dimensions.height,
    defs: [...mapLayersSvg, ...overlaysSvg].map((layer) => layer.defs).join('\n'),
    css: [...mapLayersSvg, ...overlaysSvg].map((layer) => layer.css).join('\n'),
    elements: [...mapLayersSvg, ...overlaysSvg].map((layer) => layer.markup).join('\n'),
  });
}
