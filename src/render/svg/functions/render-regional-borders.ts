import path from 'path';
import { BorderSection } from '../../../compute';
import { Faction, getRandomColor, logger, TextTemplate } from '../../../common';
import { generateSectionPath } from './generate-section-path';
import { EMPTY_FACTION } from '../../../compute/constants';

/**
 * Generates the markup and css to render out borders.
 *
 * @param level The level of the borders
 * @param borderSections The map of factions with each faction's borders (one or several border sections per faction)
 * @param factionMap The factionKey->faction map of all top-level factions
 * @param theme The render color theme
 * @param renderCurves Whether to render bezier curves (if available) or only straight lines
 */
export function renderRegionalBorders(
  level: number,
  borderSections: Array<BorderSection>,
  factionMap: Record<string, Faction>,
  theme: 'light' | 'dark',
  renderCurves = false,
) {
  const templatePath = path.join(__dirname, '../templates/', theme);
  const layerTemplate = new TextTemplate('element-group.svg.tpl', templatePath);
  const edgeTemplate = new TextTemplate('regional-border-section.svg.tpl', templatePath);
  const cssTemplate = new TextTemplate('regional-border-section.css.tpl', templatePath);
  const factionCssTemplate = new TextTemplate('regional-border-section-faction.css.tpl', templatePath);
  let borderSectionsMarkup = '';
  let css = cssTemplate.replace({
    level,
    strokeWidth: 1 / level,
  });
  borderSections.forEach((borderSection) => {
    const factionKey = borderSection.affiliation1.split(',').shift() || EMPTY_FACTION;
    css += factionCssTemplate.replace({
      level,
      faction: factionKey,
      color: factionMap[factionKey]?.color || '#000',
    });
    borderSectionsMarkup += edgeTemplate.replace({
      d: generateSectionPath(borderSection, renderCurves),
      css_class: `border-section ${factionKey}`,
      // style: `stroke: #a00; fill: none; stroke-width: 1.25`,
      // style: `stroke: #333; fill: none; stroke-width: ` + (1 / level),
      // meta: `data-info="${borderSection.affiliation1}|${borderSection.affiliation2}" ` +
      //   `data-id="${borderSection.id}"`,
    });
  });
  const markup =
    layerTemplate.replace({
      name: 'regional-borders-layer',
      id: `regional-borders-level-${level}`,
      css_class: `regional-borders level-${level}`,
      content: borderSectionsMarkup,
    });
  if (markup.trim()) {
    return {
      css,
      markup,
      //   : layerTemplate.replace({
      //   name: 'border-sections-layer',
      //   id: 'border-sections-layer',
      //   css_class: 'border-sections',
      //   content: markup,
      // }),
    };
  }
  return {
    css: '',
    markup: '',
  };
}
