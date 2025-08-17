import { Point2d, TextTemplate } from '../../../common';
import path from 'path';

export function renderRectangle(
  name: string,
  position: Point2d,
  width: number,
  height: number,
  theme: 'light' | 'dark',
  strokeWidth?: number,
  strokeColor?: string,
  fillColor?: string,
) {
  const templatePath = path.join(__dirname, '../templates/', theme);
  const rectTemplate = new TextTemplate('overlay-rectangle.svg.tpl', templatePath);
  const rectCssTemplate = new TextTemplate('overlay-rectangle.css.tpl', templatePath);
  const safeName = name.replace(/\s+/g, '');

  return {
    defs: '',
    css: rectCssTemplate.replace({
      css_class: safeName,
      strokeColor: strokeColor || '#000',
      strokeWidth: strokeWidth || 0,
      fill: fillColor || 'none',
    }),
    markup: rectTemplate.replace({
      name: safeName,
      css_class: safeName,
      x: position.x.toFixed(2),
      y: position.y.toFixed(2),
      width: width.toFixed(2),
      height: height.toFixed(2),
    }),
  };
}
