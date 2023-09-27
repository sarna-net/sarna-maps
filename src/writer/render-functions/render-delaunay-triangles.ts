import { DelaunayTriangle } from '../../mapgen';
import { Template } from '../../utils';

/**
 * Generates the markup and css to render out delaunay triangles.
 * Deactivated by default, this is mostly for visual debugging.
 * 
 * @param delaunayTriangles The array of delaunay triangles
 * @returns The delaunay SVG markup and CSS styles
 */
export function renderDelaunayTriangles(delaunayTriangles: DelaunayTriangle[]) {
  // console.log('triangles', delaunayTriangles[0]);
  const cssTemplate = new Template('delaunay-triangles.css.tpl');
  const layerTemplate = new Template('map-layer.svg.tpl');
  const triangleTemplate = new Template('delaunay-triangle.svg.tpl');

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
