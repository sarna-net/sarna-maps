import { extractBorderStateAffiliation, Logger, Faction, System, TextTemplate } from '../../../common';
import path from 'path';
import { generateDisputedSystemFillPattern } from './generate-disputed-system-fill-pattern';

/**
 * Generates the markup to render out system dots.
 *
 * @param systems The systems list
 * @param factions The list of factions
 * @param eraIndex Index of the era to use
 * @param systemRadius Radius for each system dot
 * @returns The system dots markup
 */
export function renderSystems(
  systems: System[],
  factions: Record<string, Faction>,
  eraIndex = 0,
  systemRadius = 1
) {
  const templatePath = path.join(__dirname, '../templates');
  const cssTemplate = new TextTemplate('system-points.css.tpl', templatePath);
  const layerTemplate = new TextTemplate('map-layer.svg.tpl', templatePath);
  const systemTemplate = new TextTemplate('system-point.svg.tpl', templatePath);
  const capitalDecorationTemplate = new TextTemplate('system-decoration.svg.tpl', templatePath);
  const clusterTemplate = new TextTemplate('cluster-ellipse.svg.tpl', templatePath);
  const visibleFactions: Record<string, Faction> = {};

  let markup = '';
  let defs = '';
  systems.forEach((system) => {
    const eraName = system.eraNames[eraIndex] || '';
    const eraCapitalLevel = system.eraCapitalLevels[eraIndex] || 0;
    const eraAffiliation = system.eraAffiliations[eraIndex] || '';
    const displayedFaction = extractBorderStateAffiliation(eraAffiliation);
    if (!visibleFactions[displayedFaction]) {
      visibleFactions[displayedFaction] = factions[displayedFaction];
    }
    if (!system.isCluster) {
      if (eraCapitalLevel > 0 && eraCapitalLevel <= 2) {
        markup += capitalDecorationTemplate.replace({
          x: system.x.toFixed(3),
          y: (-system.y).toFixed(3), // all y coordinates need to be inverted
          radius: systemRadius * 1.5,
          name: eraName,
        });
      }
      if (eraCapitalLevel === 1) {
        markup += capitalDecorationTemplate.replace({
          x: system.x.toFixed(3),
          y: (-system.y).toFixed(3), // all y coordinates need to be inverted
          radius: systemRadius * 2,
          name: eraName,
        });
      }
      markup += systemTemplate.replace({
        x: system.x.toFixed(3),
        y: (-system.y).toFixed(3),
        radius: systemRadius,
        name: eraName,
        css_class: displayedFaction,
      });
      if (eraCapitalLevel > 0) {
        markup += capitalDecorationTemplate.replace({
          x: system.x.toFixed(3),
          y: (-system.y).toFixed(3),
          radius: systemRadius * 0.15,
          name: eraName,
        });
      }
    } else {
      markup += clusterTemplate.replace({
        x: system.x.toFixed(3),
        y: (-system.y).toFixed(3),
        rx: system.radiusX,
        ry: system.radiusY,
        name: eraName,
        css_class: displayedFaction,
      });
    }
  });

  let factionCss = '';
  Object.keys(visibleFactions).forEach((factionKey) => {
    const faction = visibleFactions[factionKey];
    if (factionKey === 'U' || factionKey === 'A') {
      return;
    } else if (factionKey === 'D') {
      // CSS for generic disputed systems is part of the default template
    } else if (factionKey.startsWith('D-')) {
      defs += generateDisputedSystemFillPattern(factionKey, factions);
      factionCss += `g.systems .system.${factionKey}, g.systems .cluster.${factionKey} { fill: url(#system-fill-${factionKey}) }\n`;
    } else if(!faction) {
      Logger.warn(`Cannot find faction for affiliation key "${factionKey}". Systems will be displayed in the default color.`);
    } else {
      factionCss += `g.systems .system.${factionKey}, g.systems .cluster.${factionKey} { fill: ${faction?.color || '#000'} }\n`;
    }
  });

  if (markup.trim()) {
    return {
      defs,
      css: cssTemplate.replace({ faction_colors: factionCss }),
      markup: layerTemplate.replace({
        name: 'systems-dots-layer',
        id: 'systems-dots-layer',
        css_class: 'systems',
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
