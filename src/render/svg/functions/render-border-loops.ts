import path from 'path';
import { BorderEdgeLoop } from '../../../compute';
import { Faction, TextTemplate } from '../../../common';
import { EMPTY_FACTION, INDEPENDENT } from '../../../compute/constants';
import { generateSectionPath } from './generate-section-path';

/**
 * Generates the markup and css to render out borders.
 *
 * @param borderLoops The map of factions with each faction's borders (one or several border loops per faction)
 * @param factions Map of all faction objects, by faction key
 * @param renderCurves true to render control points to curve edges
 * @param prefix A string used to prefix all css classes and defs
 */
export function renderBorderLoops(
  borderLoops: Record<string, Array<BorderEdgeLoop>>,
  factions: Record<string, Faction>,
  renderCurves = true,
  prefix = '',
) {
  const templatePath = path.join(__dirname, '../templates');
  const defTemplate = new TextTemplate('disputed-faction-fill-def.svg.tpl', templatePath);
  const cssTemplate = new TextTemplate('border-faction.css.tpl', templatePath);
  const layerTemplate = new TextTemplate('element-group.svg.tpl', templatePath);
  const edgeTemplate = new TextTemplate('border-path.svg.tpl', templatePath);
  let markup = '';
  let css = '';
  let defs = '';
  const defPrefix = prefix.length ? prefix + '-' : '';
  const cssPrefix = prefix.length ? `.${prefix} ` : '';
  Object.keys(borderLoops).forEach((factionKey) => {
    if (!factionKey || factionKey === EMPTY_FACTION || factionKey === INDEPENDENT) {
      return;
    }
    // add faction css and defs, if necessary
    if (factionKey === 'D' || factionKey.startsWith('D-')) {
      const factionKeys = factionKey.replace(/^D-/g, '').split('-');
      // the specifically colored disputed areas are only supported for 2 disputing
      // factions, everything above 2 will be displayed as "generic disputed"
      if (factionKeys.length === 2) {
        defs += defTemplate.replace({
          prefix: defPrefix,
          id: factionKey,
          color1: factions[factionKeys[0]].color,
          color2: factions[factionKeys[1]].color,
        });
      } else {
        factionKey = 'D';
      }
      css += cssTemplate.replace({
        prefix: cssPrefix,
        id: factionKey,
        strokeColor: 'transparent',
        strokeWidth: '0',
        fill: `url(#${defPrefix}border-fill-${factionKey})`,
      });
    } else {
      css += cssTemplate.replace({
        prefix: cssPrefix,
        id: factionKey,
        strokeColor: factions[factionKey]?.color || '#000',
        strokeWidth: '1px',
        fill: (factions[factionKey]?.color || '#000'),
      });
    }

    let factionMarkup = '';
    const loopPaths: Array<string> = [];
    let loopAffiliations = '';
    borderLoops[factionKey].forEach((borderLoop) => {
      if ([undefined, EMPTY_FACTION].includes(borderLoop.innerAffiliation)) {
        return;
      }
      loopAffiliations += borderLoop.innerAffiliation + ',';
      loopPaths.push(generateSectionPath(borderLoop, renderCurves));
    });

    if (loopPaths.length > 0) {
      factionMarkup += edgeTemplate.replace({ d: loopPaths.join(' ') });
    }
    markup += layerTemplate.replace({
      name: factionKey,
      css_class: 'faction-border-' + factionKey,
      content: factionMarkup,
    });
  });
  if (markup.trim()) {
    return {
      defs,
      css,
      markup: layerTemplate.replace({
        name: 'borders-layer',
        css_class: 'borders',
        content: markup,
      }),
    };
  }
  return {
    defs: '',
    css: '',
    markup: '',
  };
}
