import { TextTemplate } from '../../../common';
import path from 'path';
import { SalientPoint } from '../../../compute';

export function renderSalients(points: Array<SalientPoint>) {
  const templatePath = path.join(__dirname, '../templates');
  const layerTemplate = new TextTemplate('element-group.svg.tpl', templatePath);
  const salientPointTemplate = new TextTemplate('salient-point.svg.tpl', templatePath);
  const cssTemplate = new TextTemplate('salients.css.tpl', templatePath);

  let markup = '';
  points.forEach((point) => {
    markup += salientPointTemplate.replace({
      x: point.x,
      y: -point.y, // all y coordinates need to be inverted
      radius: 3,
      style: `fill: red; stroke: yellow; stroke-width: 0.5`,
      affiliation: point.affiliation,
      info: point.info,
    });
  });


  if (markup.trim()) {
    return {
      css: cssTemplate.replace(),
      markup: layerTemplate.replace({
        name: 'salients-layer',
        id: 'salients-layer',
        css_class: 'salients',
        content: markup,
      }),
    };
  }
  return {
    css: '',
    markup: '',
  };
}
