import path from 'path';
import { BorderSection } from '../../../compute';
import { getRandomColor, TextTemplate } from '../../../common';
import { generateSectionPath } from './generate-section-path';

/**
 * Generates the markup and css to render out borders.
 *
 * @param borderSections The map of factions with each faction's borders (one or several border sections per faction)
 * @param theme The render color theme
 * @param renderCurves Whether to render bezier curves (if available) or only straight lines
 */
export function renderBorderSections(
  borderSections: Array<BorderSection>,
  theme: 'light' | 'dark',
  // threeWayNodes: Record<string, Array<string>>,
  // edgeMap: Record<string, VoronoiBorderEdge>,
  renderCurves = true,
) {
  const templatePath = path.join(__dirname, '../templates/', theme);
  const layerTemplate = new TextTemplate('element-group.svg.tpl', templatePath);
  const edgeTemplate = new TextTemplate('border-section.svg.tpl', templatePath);
  let relaxedEdgeMarkup = '';
  let css = '';
  borderSections.forEach((borderSection) => {
    const color = getRandomColor();
    relaxedEdgeMarkup += edgeTemplate.replace({
      d: generateSectionPath(borderSection, renderCurves),
      // style: `stroke: #a00; fill: none; stroke-width: 1.25`,
      style: `stroke: ${color}; fill: none; stroke-width: 1.25`,
      meta: `data-affiliations="${borderSection.affiliation1}|-|${borderSection.affiliation2}"`,
    });
  });
  const markup =
    layerTemplate.replace({
    name: 'relaxed-edges-layer',
    id: 'relaxed-edges-layer',
    css_class: 'border-sections',
    content: relaxedEdgeMarkup,
  });
  if (markup.trim()) {
    return {
      css,
      markup: layerTemplate.replace({
        name: 'border-sections-layer',
        id: 'border-sections-layer',
        css_class: 'border-sections',
        content: markup,
      }),
    };
  }
  return {
    css: '',
    markup: '',
  };
}
