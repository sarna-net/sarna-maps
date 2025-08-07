import { Era, GeneratorConfigOverlay, System } from '../../../common';
import { renderRectangle } from './render-rectangle';
import { renderSvgElement } from './render-svg-element';
import { renderScale } from './render-scale';

export function renderMapOverlay(config: GeneratorConfigOverlay, era: Era, system?: System) {
  switch (config.type) {
    case 'rectangle':
      return renderRectangle(
        config.name,
        config.position,
        config.attributes.width,
        config.attributes.height,
        config.attributes.strokeWidth,
        config.attributes.strokeColor,
        config.attributes.fillColor,
      );
    // case 'text':
    //   return renderMapOverlayText();
    case 'scale':
      return renderScale(
        config.name,
        config.position,
        config.attributes.pixelsPerMapUnit,
        config.attributes.step,
        config.attributes.max,
        config.attributes.scaleHeight,
        config.attributes.labelsPosition,
        config.attributes.mapUnitName,
      );
    case 'svgElement':
      return renderSvgElement(
        config.name,
        config.position,
        config.attributes.svgTemplate,
        config.attributes.cssTemplate,
        config.attributes.scale,
      );
    default:
      return {
        defs: '',
        css: '',
        markup: '',
      };
  }
}
