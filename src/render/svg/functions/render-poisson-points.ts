import { Point2d, TextTemplate } from '../../../common';
import path from 'path';

/**
 * Generates the markup to render out Poisson disc points.
 * Deactivated by default, this is mostly for visual debugging.
 *
 * @param poissonPoints The array of generated poisson points
 * @param areaRadius The "exclusive" radius of each point
 * @param pointRadius The visual radius of each point
 * @returns The poisson SVG markup and CSS styles
 */
export function renderPoissonPoints(poissonPoints: Point2d[], areaRadius = 35, pointRadius = 3) {
  const templatePath = path.join(__dirname, '../templates');
  const cssTemplate = new TextTemplate('poisson-points.css.tpl', templatePath);
  const layerTemplate = new TextTemplate('map-layer.svg.tpl', templatePath);
  const pointTemplate = new TextTemplate('poisson-point.svg.tpl', templatePath);

  let markup = '';
  poissonPoints.forEach((point) => {
    markup += pointTemplate.replace({
      x: point.x,
      y: -point.y, // all y coordinates need to be inverted
      radius_area: areaRadius,
      radius_point: pointRadius,
    });
  });

  if (markup.trim()) {
    return {
      css: cssTemplate.replace(),
      markup: layerTemplate.replace({
        name: 'poisson-points-layer',
        id: 'poisson-points-layer',
        css_class: 'poisson-points',
        content: markup,
      }),
    };
  }
  return {
    css: '',
    markup: '',
  };
}
