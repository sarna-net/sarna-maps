import { BorderDelaunayVertex, VoronoiBorderNode } from '../../../compute';
import { TextTemplate } from '../../../common';
import path from 'path';

/**
 * Generates the markup and css to render out voronoi nodes.
 * Deactivated by default, this is mostly for visual debugging.
 *
 * @param voronoiNodes The list of voronoi nodes
 * @param delaunayVertices The list of delaunay vertices
 * @returns The voronoi SVG markup and CSS styles
 */
export function renderVoronoiNodes(voronoiNodes: Array<VoronoiBorderNode>, delaunayVertices: Array<BorderDelaunayVertex>) {
  const templatePath = path.join(__dirname, '../templates');
  const cssTemplate = new TextTemplate('voronoi-node.css.tpl', templatePath);
  const layerTemplate = new TextTemplate('element-group.svg.tpl', templatePath);
  const nodeTemplate = new TextTemplate('voronoi-node.svg.tpl', templatePath);

  let markup = '';
  voronoiNodes.forEach((voronoiNode, voronoiId) => {
    const v1 = delaunayVertices[voronoiNode.vertex1Idx];
    const v2 = delaunayVertices[voronoiNode.vertex2Idx];
    const v3 = delaunayVertices[voronoiNode.vertex3Idx];
    if (voronoiId === 4838 || voronoiId === 4894) {
      console.log(voronoiId, voronoiNode);
    }
    markup += nodeTemplate.replace({
      name: voronoiId,
      x: voronoiNode.x,
      y: -voronoiNode.y,
      x1: v1.x,
      y1: -v1.y,
      x2: v2.x,
      y2: -v2.y,
      x3: v3.x,
      y3: -v3.y,
    });
  });

  if (markup.trim()) {
    return {
      css: cssTemplate.replace(),
      markup: layerTemplate.replace({
        name: 'voronoi-nodes-layer',
        id: 'voronoi-nodes-layer',
        css_class: 'voronoi-nodes',
        content: markup,
      }),
    };
  }
  return {
    css: '',
    markup: '',
  };
}
