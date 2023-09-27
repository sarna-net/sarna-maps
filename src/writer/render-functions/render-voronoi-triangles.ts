import { DelaunayVertex, VoronoiNode } from '../../mapgen';
import { Template } from '../../utils';

/**
 * Generates the markup and css to render out voronoi nodes.
 * Deactivated by default, this is mostly for visual debugging.
 * 
 * @param voronoiNodes The list of voronoi nodes
 * @returns The voronoi SVG markup and CSS styles
 */
export function renderVoronoiTriangles(voronoiNodes: VoronoiNode[], delaunayVertices: DelaunayVertex[]) {
  const cssTemplate = new Template('voronoi-node.css.tpl');
  const layerTemplate = new Template('map-layer.svg.tpl');
  const nodeTemplate = new Template('voronoi-node.svg.tpl');

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
