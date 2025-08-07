import path from 'path';
import { Point2d, TextTemplate } from '../../../common';

export function renderScale(
  name: string,
  position: Point2d,
  pixelsPerMapUnit: number,
  step: number,
  max: number,
  scaleHeight = 10,
  labelsPosition: 'above' | 'below' = 'above',
  mapUnitName = 'LY',
) {
  const templatePath = path.join(__dirname, '../templates');
  const scaleTemplate = new TextTemplate('scale.svg.tpl', templatePath);
  const cssTemplate = new TextTemplate('scale.css.tpl', templatePath);
  const stepTemplate = new TextTemplate('scale-step.svg.tpl', templatePath);

  const css_class = name.replace(/\s+/g, '-');

  // TODO do these values need to be configurable?
  const stepLabelPadding = 8;
  const unitNamePadding = 8;
  const fontSize = 20;

  let stepMarkup = '';
  let stepClass = 'black';
  if (step > 0 && max > 0) {
    for (let i = 0; i < max; i += step) {
      stepMarkup += stepTemplate.replace({
        stepClass,
        x: (i * pixelsPerMapUnit).toFixed(2),
        y: 0,
        width: (Math.min(max - i, step) * pixelsPerMapUnit).toFixed(2),
        height: scaleHeight,
        labelX: (i * pixelsPerMapUnit).toFixed(2),
        labelY: -stepLabelPadding,
        labelText: String(i),
      });
      stepClass = stepClass === 'black' ? 'white' : 'black';
    }
  }

  const markup = scaleTemplate.replace({
    css_class,
    transform: `translate(${position.x}px, ${position.y}px)`,
    stepElements: stepMarkup,
    unitName: mapUnitName,
    unitNameX: max * pixelsPerMapUnit + unitNamePadding,
    unitNameY: scaleHeight * 0.5,
    labelX: (max * pixelsPerMapUnit).toFixed(2),
    labelY: -stepLabelPadding,
    labelText: max,
  });

  const css = cssTemplate.replace({
    css_class,
    fontSize,
  });

  return {
    defs: '',
    css,
    markup,
  };
}
