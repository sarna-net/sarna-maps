import { Era, GeneratorConfigOverlay, System } from '../../../common';
import { renderRectangle } from './render-rectangle';
import { renderSvgElement } from './render-svg-element';

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
    // case 'scale':
    //   return renderScale();
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
