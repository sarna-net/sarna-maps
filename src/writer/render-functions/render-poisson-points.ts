import { Point2d } from '../../math-2d';
import { Template } from '../../utils';

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
  const cssTemplate = new Template('poisson-points.css');
  const layerTemplate = new Template('map-layer.svg.tpl');
  const pointTemplate = new Template('poisson-point.svg.tpl');

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
