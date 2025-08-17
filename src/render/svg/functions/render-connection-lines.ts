import { ConnectionLine, TextTemplate } from '../../../common';
import path from 'path';

export function renderConnectionLines(connectionLines: Array<ConnectionLine>, theme: 'light' | 'dark') {
  const templatePath = path.join(__dirname, '../templates/', theme);
  const layerTemplate = new TextTemplate('element-group.svg.tpl', templatePath);
  const lineCssTemplate = new TextTemplate('connection-line.css.tpl', templatePath);
  const lineTemplate = new TextTemplate('connection-line.svg.tpl', templatePath);

  let markup = '';
  connectionLines.forEach((connectionLine) => {
    markup += lineTemplate.replace({
      id: connectionLine.id,
      distance: connectionLine.distance,
      x1: connectionLine.from.x.toFixed(2),
      y1: (-connectionLine.from.y).toFixed(2),
      x2: connectionLine.to.x.toFixed(2),
      y2: (-connectionLine.to.y).toFixed(2),
    });
  });
  return {
    defs: '',
    css: !!markup ? lineCssTemplate.replace() : '',
    markup: !!markup ? layerTemplate.replace({
      name: 'connection-lines',
      css_class: 'connection-lines',
      content: markup,
    }) : '',
  };
}
