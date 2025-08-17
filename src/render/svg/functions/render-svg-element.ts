import { Point2d, TextTemplate } from '../../../common';
import path from 'path';

/**
 * Renders a pre-defined SVG image into the map image, such as a logo.
 *
 * @param name The name of the overlay
 * @param position The pixel position of the overlay (relative to the map image's top left corner)
 * @param theme The render color theme
 * @param svgTemplateName The file name of the overlay's svg template
 * @param cssTemplateName The file name of the overlay's css template
 * @param scale The scale factor
 */
export function renderSvgElement(
  name: string,
  position: Point2d,
  theme: 'light' | 'dark',
  svgTemplateName: string,
  cssTemplateName = '',
  scale = 1
) {
  const templatePath = path.join(__dirname, '../templates/', theme);
  const svgTemplate = new TextTemplate(svgTemplateName, templatePath);
  const cssTemplate = cssTemplateName ? new TextTemplate(cssTemplateName, templatePath) : null;
  return {
    defs: '',
    css: cssTemplate?.replace() || '',
    markup: svgTemplate.replace({
      name,
      scale,
      translate: position.x.toFixed(2) + ',' + position.y.toFixed(2),
    }),
  }
}
