import {
  angleBetweenPoints,
  Dimensions2d,
  distance,
  GeneratorConfigMapLayerDirectionalIndicator,
  GlyphConfig,
  GlyphSettings,
  nearestPointOnRectanglePerimeter,
  pointIsInRectangle,
  radToDeg,
  Rectangle2d,
  TextTemplate,
} from '../../../common';
import path from 'path';

export function renderDirectionalIndicators(
  glyphConfig: GlyphConfig,
  visibleViewRect: Rectangle2d,
  indicatorConfigs: Array<GeneratorConfigMapLayerDirectionalIndicator>,
  theme: 'light' | 'dark',
  prefix = ''
) {
  const templatePath = path.join(__dirname, '../templates/', theme);
  const indicatorTemplate = new TextTemplate('directional-indicator.svg.tpl', templatePath);
  const textTemplate = new TextTemplate('directional-indicator-text.svg.tpl', templatePath);
  const cssTemplate = new TextTemplate('directional-indicator.css.tpl', templatePath);

  const cssBase = prefix.replace(/\s+/g, '-');

  let markup = '';
  let css = '';
  // TODO put these values in a config file
  const arrowSize = 50;
  const textPadding = 15;
  indicatorConfigs.forEach((indicatorConfig, indicatorIndex) => {
    if (!pointIsInRectangle(indicatorConfig.coordinates, visibleViewRect)) {
      const nearestPoint = nearestPointOnRectanglePerimeter(indicatorConfig.coordinates, visibleViewRect, 0);
      const perimeterPoint = nearestPointOnRectanglePerimeter(indicatorConfig.coordinates, visibleViewRect, 20);
      const css_class = cssBase + '-indicator-' + (indicatorIndex + 1);
      const distanceFromPerimeter = distance(indicatorConfig.coordinates, nearestPoint);
      if (!indicatorConfig.minimumIndicatorDistance || (distanceFromPerimeter >= indicatorConfig.minimumIndicatorDistance)) {
        const angle = angleBetweenPoints(indicatorConfig.coordinates, { x: perimeterPoint.x, y: -perimeterPoint.y });
        // see how close the angle is to 0 / 180 degrees
        const horizontality = Math.abs(Math.cos(angle)) * 0.9 + 0.25;

        const smallerTextSizeFactor = 0.75 * (indicatorConfig.textSizeFactor || 1);
        const textTokens: Array<string> = [indicatorConfig.text];
        const textDimensions: Array<Dimensions2d> = [
          getTextDimensions(glyphConfig.regular, textTokens[0], indicatorConfig.textSizeFactor || 1)
        ];
        // figure out text elements
        if (!indicatorConfig.minimumMeasurementDistance || (distanceFromPerimeter >= indicatorConfig.minimumMeasurementDistance)) {
          // show measurement
          textTokens.push(Math.round(distanceFromPerimeter) + (indicatorConfig.mapUnitName || ' LY'));
          textDimensions.push(getTextDimensions(glyphConfig.regular, textTokens[1], smallerTextSizeFactor));
        }
        const textBaseX = (perimeterPoint.x <= visibleViewRect.anchor.x + visibleViewRect.dimensions.width * 0.5)
          ? textPadding + arrowSize * horizontality
          : -textPadding - arrowSize * horizontality;
        const textBaseY = perimeterPoint.y === visibleViewRect.anchor.y
          ? -textPadding
          : perimeterPoint.y === visibleViewRect.anchor.y + visibleViewRect.dimensions.height
            ? textDimensions[0].height + textPadding
            : 0;

        let textElements = '';
        textTokens.forEach((textToken, tokenIndex) => {
          const tokenBaseY = (perimeterPoint.y > visibleViewRect.anchor.y + visibleViewRect.dimensions.height * 0.5) && (textTokens.length === 2) && (tokenIndex === 1)
            ? textBaseY + textDimensions[1].height
            : (perimeterPoint.y <= visibleViewRect.anchor.y + visibleViewRect.dimensions.height * 0.5) && (textTokens.length === 2) && (tokenIndex === 0)
              ? textBaseY - textDimensions[1].height
              : textBaseY;
          textElements += textTemplate.replace({
            x: textBaseX,
            y: tokenBaseY,
            text: textToken,
            css_class: (textBaseX < 0 ? 'align-right' : '') + (tokenIndex > 0 ? ' small' : ''),
          });
        });
        css += cssTemplate.replace({
          css_class,
          strokeWidth: indicatorConfig.strokeWidth || 4,
          strokeColor: indicatorConfig.strokeColor || '#fff',
          fillColor: indicatorConfig.fillColor || '#a00',
          fontSize: (2.5 * (indicatorConfig.textSizeFactor || 1)).toFixed(1), // TODO put base font size in glyph config
          fontSizeSmall: (2.5 * (indicatorConfig.textSizeFactor || 1) * 0.75).toFixed(1),
        });
        markup += indicatorTemplate.replace({
          css_class,
          arrowX: perimeterPoint.x.toFixed(2),
          arrowY: (-perimeterPoint.y).toFixed(2),
          arrowAngle: radToDeg(angle).toFixed(1),
          elements: textElements,
        });
      }
    }
  });

  if (markup !== '') {
    return {
      defs: '',
      css,
      markup,
    };
  }
  return {
    defs: '',
    css: '',
    markup: '',
  };
}

/**
 * Helper function that calculates the dimensions of a given token of text
 *
 * @param glyphSettings The glyph config settings for a given font
 * @param text The text token to measure
 * @param sizeFactor The size factor to use (multiply base measurements by this factor)
 */
function getTextDimensions(glyphSettings: GlyphSettings, text: string, sizeFactor: number) {
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    width += (glyphSettings.widths[text[i]] || glyphSettings.widths.default) * sizeFactor;
  }
  return {
    height: glyphSettings.lineHeight * sizeFactor * 0.9,
    width,
  }
}
