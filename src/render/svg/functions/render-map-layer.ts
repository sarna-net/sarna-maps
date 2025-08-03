import { Era, GeneratorConfigMapLayer, System } from '../../../common';

export function renderMapLayer(mapLayerConfig: GeneratorConfigMapLayer, era: Era, system?: System) {
  mapLayerConfig.name;
  if (mapLayerConfig.dimensions) {

  }
  let layerPosition = { x: 0, y: 0 };
  if (mapLayerConfig.position) {
    layerPosition = { ...mapLayerConfig.position };
  }
  mapLayerConfig.mapUnitDimensions;
  if (!!mapLayerConfig.elements.factions) {
    mapLayerConfig.elements.factions.curveBorderEdges;
  }
  if (mapLayerConfig.elements.jumpRings) {}
  if (mapLayerConfig.elements.systems) {}
  if (mapLayerConfig.elements.systemLabels) {}
  if (mapLayerConfig.elements.borderLabels) {}

  return {
    defs: '',
    css: '',
    markup: '',
  };
}
