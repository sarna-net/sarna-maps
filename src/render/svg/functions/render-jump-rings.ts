import { GeneratorConfigMapLayer, Point2d, TextTemplate } from '../../../common';
import path from 'path';

export function renderJumpRings(
  mapLayerConfig: GeneratorConfigMapLayer,
  centerPoint: Point2d,
  theme: 'light' | 'dark',
  prefix = '',
) {
  const radii = mapLayerConfig.elements.jumpRings?.radii || [];
  const groupCssClass = 'jump-rings';
  const jumpRadiusCenter = {
    x: centerPoint.x + (mapLayerConfig.elements.jumpRings?.delta?.x || 0),
    y: centerPoint.y + (mapLayerConfig.elements.jumpRings?.delta?.y || 0),
  };

  if (radii.length > 0) {
    const templatePath = path.join(__dirname, '../templates/', theme);
    const groupTemplate = new TextTemplate('element-group.svg.tpl', templatePath);
    const circleTemplate = new TextTemplate('jump-circle.svg.tpl', templatePath);
    const circleCssTemplate = new TextTemplate('jump-circle.css.tpl', templatePath);
    let css = '';
    let circlesMarkup: Array<string> = [];

    // mapLayerConfig.elements.jumpRings?.delta
    radii.forEach((radius, jumpRingIndex) => {
      const circleCssClass = 'jump-ring-' + (jumpRingIndex + 1);
      const strokeWidth =
        Array.isArray(mapLayerConfig.elements.jumpRings?.strokeWidths)
          ? mapLayerConfig.elements.jumpRings.strokeWidths.length > jumpRingIndex
            ? mapLayerConfig.elements.jumpRings.strokeWidths[jumpRingIndex]
            : 0
          : mapLayerConfig.elements.jumpRings?.strokeWidths || 0;
      const strokeColor =
        Array.isArray(mapLayerConfig.elements.jumpRings?.strokeColors)
          ? mapLayerConfig.elements.jumpRings.strokeColors.length > jumpRingIndex
            ? mapLayerConfig.elements.jumpRings.strokeColors[jumpRingIndex]
            : '#000'
          : mapLayerConfig.elements.jumpRings?.strokeColors || '#000';
      const fill =
        Array.isArray(mapLayerConfig.elements.jumpRings?.fillColors)
          ? mapLayerConfig.elements.jumpRings.fillColors.length > jumpRingIndex
            ? mapLayerConfig.elements.jumpRings.fillColors[jumpRingIndex]
            : 'none'
          : mapLayerConfig.elements.jumpRings?.fillColors || 'none';
      css += circleCssTemplate.replace({
        prefix: '.' + prefix,
        group_css_class: groupCssClass,
        css_class: circleCssClass,
        strokeColor,
        strokeWidth,
        fill,
      });
      circlesMarkup.push(circleTemplate.replace({
        css_class: circleCssClass,
        cx: jumpRadiusCenter.x.toFixed(3),
        cy: (-jumpRadiusCenter.y).toFixed(3),
        r: radius,
      }));
    });

    const markup = groupTemplate.replace({
      name: groupCssClass,
      css_class: groupCssClass,
      content: circlesMarkup.join('\n'),
    });

    if (circlesMarkup.length > 0) {
      return {
        defs: '',
        css,
        markup,
      }
    }
  }
  return {
    defs: '',
    css: '',
    markup: '',
  }
}
