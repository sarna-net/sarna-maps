import path from 'path';
import { Point2d, TextTemplate } from '../../../common';

export function renderSarnaLogo(scale: number, topLeftAnchor: Point2d) {
  const templatePath = path.join(__dirname, '../templates');
  const logoCssTemplate = new TextTemplate('sarna-logo.css.tpl', templatePath);
  const logoTemplate = new TextTemplate('sarna-logo.svg.tpl', templatePath);
  return {
    css: logoCssTemplate.replace(),
    markup: logoTemplate.replace({
      scale,
      translate: topLeftAnchor.x.toFixed(2) + 'px,' + topLeftAnchor.y.toFixed(2) + 'px',
    }),
  }
}
