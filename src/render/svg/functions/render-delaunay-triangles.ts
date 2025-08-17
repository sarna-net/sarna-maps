import { DelaunayTriangle, DelaunayVertex, TextTemplate } from '../../../common';
import path from 'path';

/**
 * Generates the markup and css to render out delaunay triangles.
 * Deactivated by default, this is mostly for visual debugging.
 *
 * @param delaunayTriangles The array of delaunay triangles
 * @param theme The render color theme
 * @returns The delaunay SVG markup and CSS styles
 */
export function renderDelaunayTriangles(
  delaunayTriangles: Array<DelaunayTriangle<DelaunayVertex>>,
  theme: 'light' | 'dark',
) {
  const templatePath = path.join(__dirname, '../templates/', theme);
  const cssTemplate = new TextTemplate('delaunay-triangles.css.tpl', templatePath);
  const layerTemplate = new TextTemplate('element-group.svg.tpl', templatePath);
  const triangleTemplate = new TextTemplate('delaunay-triangle.svg.tpl', templatePath);

  let markup = '';
  delaunayTriangles.forEach((triangle) => {
    markup += triangleTemplate.replace({
      x0: triangle[0].x,
      y0: -triangle[0].y,
      x1: triangle[1].x,
      y1: -triangle[1].y,
      x2: triangle[2].x,
      y2: -triangle[2].y,
    });
  });

  if (markup.trim()) {
    return {
      css: cssTemplate.replace(),
      markup: layerTemplate.replace({
        name: 'delaunay-triangles-layer',
        id: 'delaunay-triangles-layer',
        css_class: 'delaunay-triangles',
        content: markup,
      }),
    };
  }
  return {
    css: '',
    markup: '',
  };
}
