import path from 'path';
import { BorderLabelsResult } from '../../../compute';
import { Faction, hexStringToRgb, pointOnLine, rgbToHexString, TextTemplate } from '../../../common';

export function renderBorderLabels(result: BorderLabelsResult, factions: Record<string, Faction>) {
  const templatePath = path.join(__dirname, '../templates');
  const debugCssTemplate = new TextTemplate('border-label.debug.css.tpl', templatePath);
  const cssTemplate = new TextTemplate('border-label.css.tpl', templatePath);
  const debugLabelTemplate = new TextTemplate('border-label.debug.svg.tpl', templatePath);
  const debugOverlapTemplate = new TextTemplate('border-label.overlap.debug.svg.tpl', templatePath);
  const labelTemplate = new TextTemplate('border-label.svg.tpl', templatePath);
  const labelTokenDefsTemplate = new TextTemplate('border-label-token-defs.svg.tpl', templatePath);
  const labelTokenTemplate = new TextTemplate('border-label-token.svg.tpl', templatePath);
  const layerTemplate = new TextTemplate('map-layer.svg.tpl', templatePath);
  let debugMarkup = '';
  let defs = '';
  let css = '';
  let markup = '';
  Object.keys(result.candidatesByFaction).forEach((factionKey) => {
    const candidates = result.candidatesByFaction[factionKey];
    // debug mode output
    if (false && factionKey === 'WB') {
      candidates.forEach((candidate, candidateIndex) => {
        if (candidate.labelVariant === 'Abbreviation') {
          return;
        }
        const rectPath = `M` + candidate.rect.bl.x.toFixed(2) + `,`
          + (-candidate.rect.bl.y).toFixed(2) + ' L'
          + candidate.rect.tl.x.toFixed(2) + ','
          + (-candidate.rect.tl.y).toFixed(2) + ' '
          + candidate.rect.tr.x.toFixed(2) + ','
          + (-candidate.rect.tr.y).toFixed(2) + ' '
          + candidate.rect.br.x.toFixed(2) + ','
          + (-candidate.rect.br.y).toFixed(2) + 'z';
        let rectClass = candidate.disqualified ? 'disqualified ' : '';
        if (candidate.score >= 0.9) {
          rectClass += 'p90';
        } else if (candidate.score >= 0.8) {
          rectClass += 'p80';
        } else if (candidate.score >= 0.7) {
          rectClass += 'p70';
        } else if (candidate.score >= 0.6) {
          rectClass += 'p60';
        } else if (candidate.score >= 0.5) {
          rectClass += 'p50';
        } else if (candidate.score >= 0.4) {
          rectClass += 'p40';
        } else if (candidate.score >= 0.3) {
          rectClass += 'p30';
        } else if (candidate.score >= 0.2) {
          rectClass += 'p20';
        } else if (candidate.score >= 0.1) {
          rectClass += 'p10';
        } else {
          rectClass += 'p00';
        }
        debugMarkup += debugLabelTemplate.replace({
          score: candidate.score,
          x: candidate.anchorPoint.x.toFixed(2),
          y: (-candidate.anchorPoint.y).toFixed(2),
          c1x: candidate.controlPoints![0].x.toFixed(2),
          c1y: (-candidate.controlPoints![0].y).toFixed(2),
          c2x: candidate.controlPoints![1].x.toFixed(2),
          c2y: (-candidate.controlPoints![1].y).toFixed(2),
          p1x: candidate.perpEdge![0].x.toFixed(2),
          p1y: -(candidate.perpEdge![0].y).toFixed(2),
          p2x: candidate.perpEdge![1].x.toFixed(2),
          p2y: -(candidate.perpEdge![1].y).toFixed(2),
          // i: candidateIndex,
          // cls: candidate.pointIsInside ? 'inside' : 'outside',
          rectPath,
          rectClass,
          id: candidate.id,
          label_overlap: candidate.labelOverlapArea,
          disqualification: candidate.disqualificationReason || '',
        });

        if (debugOverlapTemplate) {
          (candidate.overlapPolygons || []).forEach((polygon) => {
            let path = 'M';
            polygon.forEach((point, pointIndex) => {
              if (pointIndex > 0) {
                path += ' L';
              }
              path += point.x.toFixed(2) + ',' + (-point.y).toFixed(2);
            });
            path += 'z';
            debugMarkup += debugOverlapTemplate.replace({ path });
          });
        }
      });
    }

    // make sure the border labels are visible against the faction background
    const rgba = hexStringToRgb(factions[factionKey]?.color || '#000')
      || { r: 0, g: 0, b: 0, };
    rgba.r *= 255;
    rgba.g *= 255;
    rgba.b *= 255;
    while(rgba.r + rgba.g + rgba.b >= 500) {
      rgba.r *= .8;
      rgba.g *= .8;
      rgba.b *= .8;
    }
    while(rgba.r + rgba.g >= 420) {
      //rgba.r = rgba.g = rgba.b = 0;
      rgba.r *= .4;
      rgba.g *= .4;
      rgba.b *= .4;
    }
    const factionLabelColor = rgbToHexString({
      r: Math.round(rgba.r),
      g: Math.round(rgba.g),
      b: Math.round(rgba.b),
    });

    let labelDefs = '';
    candidates.forEach((candidate) => {
      let labelMarkup = '';
      candidate.tokens.forEach((token, tokenIndex) => {
        const tokenId = candidate.id + '-T-' + tokenIndex;
        const baseline = candidate.labelBaselines.middle && tokenIndex === 0
          ? candidate.labelBaselines.middle
          : candidate.labelBaselines.bottom;
        const midPoint = {
          x: 0.5 * (baseline.p1.x + baseline.p2.x),
          y: 0.5 * (baseline.p1.y + baseline.p2.y),
        };
        const startPoint = pointOnLine(midPoint, baseline.p1, token.width * 0.5);
        const endPoint = pointOnLine(midPoint, baseline.p2, token.width * 0.5);
        // create label path for defs section
        labelDefs += labelTokenDefsTemplate.replace({
          id: tokenId,
          path: `M`
            + startPoint.x.toFixed(2) + ','
            + (-startPoint.y).toFixed(2)
            + ' L'
            + endPoint.x.toFixed(2) + ','
            + (-endPoint.y).toFixed(2),
        });
        // create label tokens
        labelMarkup += labelTokenTemplate.replace({
          id: tokenId,
          token: token.str,
        });
      });
      markup += labelTemplate.replace({
        id: candidate.id,
        content: labelMarkup,
        css_class: `border-label ${factionKey}`
      });
    });
    if (candidates.length > 0) {
      css += cssTemplate.replace({
        factionKey,
        color: factionLabelColor,
      });
    }
    defs += labelDefs;
  });
  if (debugMarkup.trim()) {
    return {
      css: debugCssTemplate.replace()
        + css,
      markup: layerTemplate.replace({
        name: 'border-labels-debug-layer',
        id: 'border-labels-debug-layer',
        css_class: 'border-labels',
        content: debugMarkup,
      }) + layerTemplate.replace({
        name: 'border-labels-layer',
        id: 'border-labels-layer',
        css_class: 'border-labels',
        content: markup,
      }),
      defs,
    };
  }
  return {
    css,
    markup: layerTemplate.replace({
      name: 'border-labels-layer',
      id: 'border-labels-layer',
      css_class: 'border-labels',
      content: markup,
    }),
    defs,
  };
}
