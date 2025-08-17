import path from 'path';
import { hslToRgb, rgbToHsl, TextTemplate } from '../../../common';
import { FactionLabel } from '../../../compute';

export function renderFactionLabels(factionLabels: Array<FactionLabel>, theme: 'light' | 'dark') {
  const templatePath = path.join(__dirname, '../templates/', theme);
  const cssTemplate = new TextTemplate('area-labels.css.tpl', templatePath);
  const factionCssTemplate = new TextTemplate('area-labels-faction.css.tpl', templatePath);
  const layerTemplate = new TextTemplate('element-group.svg.tpl', templatePath);
  const defTemplate = new TextTemplate('area-label-def.svg.tpl', templatePath);
  const markupTemplateSingleLine = new TextTemplate('area-label-markup-single-line.svg.tpl', templatePath);
  const markupTemplateMultiLine = new TextTemplate('area-label-markup-multi-line.svg.tpl', templatePath);
  let defs = '';
  let markup = '';
  let css = '';

  factionLabels.forEach((factionLabel) => {
    let d = '';
    for (let i = 0; i < factionLabel.labelPath.length; i++) {
      if (i === 0) {
        d += 'M';
      } else if (factionLabel.labelPath.length !== 3) {
        d += 'L';
      } else if (i === 1) {
        d += 'Q';
      } else {
        d += '';
      }
      d += `${factionLabel.labelPath[i].x.toFixed(3)},` +
        `${(-factionLabel.labelPath[i].y).toFixed(3)} `;
    }
    // markup += `<path d="${d.trim()}" style="stroke-width: 0.6; stroke: red; fill: none;" />`;
    // markup += `<circle cx="${factionLabel.labelPath[1].x}" cy="${-factionLabel.labelPath[1].y}" r="5" style="fill: red; stroke-width: 0;" />`;

    let sizeFactor = 1;
    const maxTokenWidth = 20 * factionLabel.labelTokens.reduce((max, current) => Math.max(max, current.length), 0);
    if (maxTokenWidth >= factionLabel.labelPathLength) {
      sizeFactor = factionLabel.labelPathLength / maxTokenWidth;
    }

    // make sure the faction labels are dark enough to be readable
    const colorHsl = rgbToHsl(factionLabel.color);
    if (colorHsl.l >= 0.8) {
      colorHsl.l *= 0.25;
    } else if (colorHsl.l >= 0.5) {
      colorHsl.l *= 0.5;
    }
    const safeLabelColor = hslToRgb(colorHsl);

    css += factionCssTemplate.replace({
      id: factionLabel.id,
      color: safeLabelColor,
      // fontSize: Math.floor(32 * sizeFactor),
      fontSize: Math.min(36, Math.floor(48 * sizeFactor)),
    });

    const defId = 'area-label-path-' + factionLabel.id;
    defs += defTemplate.replace({
      id: defId,
      d,
    });

    if (factionLabel.labelTokens.length >= 2) {
      markup += markupTemplateMultiLine.replace({
        id: defId,
        factionId: factionLabel.id,
        name1: factionLabel.labelTokens[0],
        name2: factionLabel.labelTokens[1],
      });
    } else {
      markup += markupTemplateSingleLine.replace({
        id: defId,
        factionId: factionLabel.id,
        name: factionLabel.labelTokens[0],
      });
    }
  });

  if (markup.trim()) {
    return {
      css: cssTemplate.replace() + css,
      defs: layerTemplate.replace({
        name: 'area-labels-definitions',
        content: defs,
      }),
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
    defs: '',
    markup,
  }
}
