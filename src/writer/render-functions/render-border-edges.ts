import { BorderEdge, EMPTY_FACTION } from '../../mapgen';
import { Template } from '../../utils';

/**
 * Generates the markup and css to render out border edges.
 * Deactivated by default, this is mostly for visual debugging.
 * 
 * @param borderEdges The map of factions with each faction's border edges
 * @returns 
 */
export function renderBorderEdges(borderEdges: Record<string, BorderEdge[]>) {
  const cssTemplate = new Template('border-edge.css.tpl');
  const layerTemplate = new Template('map-layer.svg.tpl');
  const edgeTemplate = new Template('border-edge.svg.tpl');
  let markup = '';
  Object.keys(borderEdges).forEach((factionKey) => {
    if (!factionKey || factionKey === EMPTY_FACTION) {
      return;
    }
    let factionMarkup = '';
    borderEdges[factionKey].forEach((borderEdge) => {
      factionMarkup += edgeTemplate.replace({
        x0: borderEdge.node1.x,
        y0: -borderEdge.node1.y,
        x1: borderEdge.node2.x,
        y1: -borderEdge.node2.y,
      });
    });
    markup += layerTemplate.replace({
      name: factionKey,
      id: 'faction-edges-' + factionKey,
      content: factionMarkup,
    });
  });
  if (markup.trim()) {
    return {
      css: cssTemplate.replace(),
      markup: layerTemplate.replace({
        name: 'border-edges-layer',
        id: 'border-edges-layer',
        css_class: 'border-edges',
        content: markup,
      }),
    };
  }
  return {
    css: '',
    markup: '',
  };
}
