import { Point2d, TextTemplate, VoronoiNode } from '../../../common';
import path from 'path';

export function renderAreaLabels(triangles: Array<{ p1: Point2d, p2: Point2d, p3: Point2d }>, nodes: Array<VoronoiNode>) {
  const templatePath = path.join(__dirname, '../templates');
  const cssTemplate = new TextTemplate('area-labels.css.tpl', templatePath);
  const layerTemplate = new TextTemplate('map-layer.svg.tpl', templatePath);
  let markup = '';

  triangles.forEach((triangle) => {
    let d = `M${triangle.p1.x.toFixed(2)},${(-triangle.p1.y).toFixed(2)} ` +
      `L${triangle.p2.x.toFixed(2)},${(-triangle.p2.y).toFixed(2)} ` +
      `L${triangle.p3.x.toFixed(2)},${(-triangle.p3.y).toFixed(2)}z`;
    markup += `<path d="${d}" class="triangle" />`;
  });

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    markup += `<circle cx="${node.x.toFixed(2)}" ` +
      `cy="${(-node.y).toFixed(2)}" ` +
      `r="3" class="node" />`;
    for (let ni = 0; ni < node.neighborNodeIndices.length; ni++) {
      const neighborIndex = node.neighborNodeIndices[ni];
      if (neighborIndex > i) {
        const neighbor = nodes[neighborIndex];
        const d = `M${node.x.toFixed(2)},${(-node.y).toFixed(2)} ` +
          `L${neighbor.x.toFixed(2)},${(-neighbor.y).toFixed(2)}`;
        markup += `<path d="${d}" class="node-connection" />`;
      }
    }
  }

  if (markup.trim()) {
    return {
      css: cssTemplate.replace(),
      markup: layerTemplate.replace({
        name: 'area-labels-layer',
        id: 'area-labels-layer',
        css_class: 'area-labels',
        content: markup,
      }),
    };
  }
  return {
    css: '',
    markup,
  }
}
