import { EMPTY_FACTION } from '../../../compute/constants';
import { VoronoiBorderEdge } from '../../../compute';
import { TextTemplate } from '../../../common';
import path from 'path';

/**
 * Generates the markup and css to render out border edges.
 * Deactivated by default, this is mostly for visual debugging.
 *
 * @param borderEdges The map of factions with each faction's border edges
 * @returns
 */
export function renderBorderEdges(borderEdges: Record<string, Array<VoronoiBorderEdge>>, theme: 'light' | 'dark') {
  const templatePath = path.join(__dirname, '../templates/', theme);
  const cssTemplate = new TextTemplate('border-edge.css.tpl', templatePath);
  const layerTemplate = new TextTemplate('element-group.svg.tpl', templatePath);
  const edgeTemplate = new TextTemplate('border-edge.svg.tpl', templatePath);
  let markup = '';
  Object.keys(borderEdges).forEach((factionKey) => {
    if (!factionKey || factionKey === EMPTY_FACTION) {
      return;
    }
    let factionMarkup = '';
    borderEdges[factionKey].forEach((borderEdge) => {
      factionMarkup += edgeTemplate.replace({
        x0: borderEdge.node1.x.toFixed(2),
        y0: (-borderEdge.node1.y).toFixed(2),
        x1: borderEdge.node2.x.toFixed(2),
        y1: (-borderEdge.node2.y).toFixed(2),
        meta: `data-edge-id="${borderEdge.id}"`
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
