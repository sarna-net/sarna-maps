import path from 'path';
import { TextTemplate } from '../../../common';
import { LabelRectangle } from '../../../compute';

export function renderSystemLabels(labels: Array<LabelRectangle>, renderFrames = false) {
  const templatePath = path.join(__dirname, '../templates');
  const layerTemplate = new TextTemplate('map-layer.svg.tpl', templatePath);
  const labelTemplate = new TextTemplate('system-label.svg.tpl', templatePath);
  const additionTemplate = new TextTemplate('system-label-addition.svg.tpl', templatePath);
  const additionPartTemplate = new TextTemplate('system-label-addition-part.svg.tpl', templatePath);
  const connectorTemplate = new TextTemplate('system-label-connector.svg.tpl', templatePath);

  let markup = '';
  labels.forEach((label) => {
    // label frame (for debugging only)
    if (renderFrames) {
      markup += `<path d="M${label.anchor.x},${-label.anchor.y} `
        + `l0,${-label.dimensions.height} l${label.dimensions.width},0`
        + `l0,${label.dimensions.height} l${-label.dimensions.width},0 z" `
        + `style="stroke: red; stroke-width: 0.2; fill: none;"  />`;
    }
    // connector
    if (label.connectorPoints && label.connectorPoints.length >= 2) {
      const d = 'M' + label.connectorPoints.map(
        (point) => `${point.x.toFixed(3)},${(-point.y).toFixed(3)}`,
      ).join(' L');
      markup += connectorTemplate.replace({ d, name: label.label });
    }
    // main label
    markup += labelTemplate.replace({
      x: (label.anchor.x + label.padding.x + label.delta.x).toFixed(3),
      y: (-label.anchor.y - label.padding.y - label.delta.y).toFixed(3), // all y coordinates need to be inverted
      name: label.label || '',
      css_class: label.affiliation === 'U' ? 'undiscovered' : label.affiliation === 'A' ? 'abandoned' : '',
    });
    // label additions (capital, hidden, apocryphal)
    if (label.additions.length > 0) {
      let parts: string = '';
      label.additions.forEach((addition) => {
        parts += additionPartTemplate.replace({
          deltaX: addition.delta.x.toFixed(3),
          deltaY: (-addition.delta.y).toFixed(3),
          text: addition.text,
          class: addition.class,
        });
      });
      markup += additionTemplate.replace({
        x: (label.anchor.x + label.padding.x).toFixed(3),
        y: (-label.anchor.y - label.padding.y).toFixed(3),
        parts,
      });
    }
    // TODO
  });

  if (markup.trim()) {
    return {
      css: '',
      markup: layerTemplate.replace({
        name: 'systems-labels-layer',
        id: 'systems-labels-layer',
        css_class: 'system-labels',
        content: markup,
      }),
    };
  } else {
    return {
      css: '',
      markup: '',
    }
  }
}
