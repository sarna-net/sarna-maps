import { Faction, System } from '../../mapgen';
import { Logger, Template } from '../../utils';

/**
 * Generates the markup to render out system dots.
 * 
 * @param systems The systems list
 * @param eraIndex Index of the era to use
 * @param systemRadius Radius for each system dot
 * @returns The system dots markup
 */
export function renderSystems(
  systems: System[],
  allFactions: Record<string, Faction>,
  eraIndex = 0,
  systemRadius = 1
) {
  const cssTemplate = new Template('system-points.css.tpl');
  const layerTemplate = new Template('map-layer.svg.tpl');
  const systemTemplate = new Template('system-point.svg.tpl');

  const visibleFactions: Record<string, Faction> = {};

  let markup = '';
  systems.forEach((system) => {
    const currentEraAffiliation = system.eraAffiliations[eraIndex]?.split(',').shift() || '';
    let displayedFaction = currentEraAffiliation.trim().replace(/\([^)]+\)/g, '');
    if (!allFactions[displayedFaction]) {
      Logger.warn(`Faction "${displayedFaction}" could not be found for system "${system.name}", using "U" as a fallback`);
      displayedFaction = 'U';
    }
    if (!visibleFactions[displayedFaction]) {
      visibleFactions[displayedFaction] = allFactions[displayedFaction];
    }
    markup += systemTemplate.replace({
      x: system.x,
      y: -system.y, // all y coordinates need to be inverted
      radius: systemRadius,
      name: system.name,
      css_class: currentEraAffiliation,
    });
  });

  let factionCss = '';
  Object.keys(visibleFactions).forEach((factionKey) => {
    const faction = visibleFactions[factionKey];
    factionCss += `g.systems .system.${factionKey} { fill: ${faction?.color || '#000'} }\n`;
  });

  if (markup.trim()) {
    return {
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
    css: '',
    markup: '',
  };
}
