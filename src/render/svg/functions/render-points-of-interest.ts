import { Point2d, TextTemplate } from '../../../common';
import path from 'path';

export function renderPointsOfInterest(points: Array<Point2d>) {
  const templatePath = path.join(__dirname, '../templates');
  const layerTemplate = new TextTemplate('map-layer.svg.tpl', templatePath);
  const pointTemplate = new TextTemplate('point-of-interest.svg.tpl', templatePath);

  let markup = '';
  points.forEach((point) => {
    markup += pointTemplate.replace({
      x: point.x,
      y: -point.y, // all y coordinates need to be inverted
      radius: 3,
      style: `fill: red; stroke: yellow; stroke-width: 0.5`,
    });
  });


  if (markup.trim()) {
    return {
      css: '',
      markup: layerTemplate.replace({
        name: 'poi-layer',
        id: 'poi-layer',
        css_class: 'poi',
        content: markup,
      }),
    };
  }
  return {
    css: '',
    markup: '',
  };
}
