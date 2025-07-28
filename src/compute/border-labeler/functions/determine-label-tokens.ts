import { BorderLabelVariant, Faction, GlyphSettings } from '../../../common';
import { BorderLabelDetails } from '../types';

/**
 * Given a faction object and the glyph dimensions, return an object for each label variant
 * (single line, multiline and abbreviation) that contains the label's width, height and its
 * string tokens.
 *
 * @param faction The faction object
 * @param glyphSettings The settings containing measurements for all characters
 */
export function determineLabelTokens(
  faction: Faction,
  glyphSettings: GlyphSettings
): Record<BorderLabelVariant, BorderLabelDetails | undefined> {
  const spaceWidth = glyphSettings.widths[' '] || glyphSettings.widths.default;

  // sort out the faction's key label
  let factionKeyLabelWidth = 0;
  for (let i = 0; i < faction.id.length; i++) {
    factionKeyLabelWidth += glyphSettings.widths[faction.id[i]] || glyphSettings.widths.default;
  }

  // separate all tokens and determine their widths
  const tokens = faction.name.split(/\s+/).map((namePart) => {
    let tokenWidth = 0;
    for (let i = 0; i < namePart.length; i++) {
      tokenWidth += glyphSettings.widths[namePart[i]] || glyphSettings.widths.default;
    }
    return {
      str: namePart,
      width: tokenWidth,
    };
  });

  // determine single line label width
  const singleLineLabelWidth = (tokens.length - 1) * spaceWidth +
    tokens
      .map((token) => token.width)
      .reduce((sum, tokenWidth) => sum + tokenWidth, 0);

  // try to find the optimal distribution of tokens on two lines
  let multiLineLabelWidth = 0;
  const multiLineTokens: Array<{ str: string; width: number }> = [];
  if (tokens.length > 1) {
    let bestConfig = -1;
    let bestConfigWidth = Infinity;
    for (let tokensInSecondLine = 1; tokensInSecondLine < tokens.length; tokensInSecondLine++) {
      let firstLineWidth = 0;
      let secondLineWidth = 0;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens.length - i > tokensInSecondLine) {
          firstLineWidth += tokens[i].width;
        } else {
          secondLineWidth += tokens[i].width;
        }
      }
      firstLineWidth += Math.max(0, tokens.length - tokensInSecondLine - 1) * spaceWidth;
      secondLineWidth += Math.max(0, tokensInSecondLine - 1) * spaceWidth;
      const configWidth = Math.max(firstLineWidth, secondLineWidth);
      if (configWidth < bestConfigWidth) {
        bestConfigWidth = configWidth;
        bestConfig = tokensInSecondLine;
      }
    }
    if (bestConfig >= 1) {
      const topTokens = tokens.slice(0, tokens.length - bestConfig);
      const bottomTokens = tokens.slice(tokens.length - bestConfig);
      multiLineLabelWidth = bestConfigWidth;
      multiLineTokens.push({
        str: topTokens.map((token) => token.str).join(' '),
        width: topTokens
            .map((token) => token.width)
            .reduce((sum, current) => sum + current)
          + (topTokens.length - 1) * spaceWidth,
      });
      multiLineTokens.push({
        str: bottomTokens.map((token) => token.str).join(' '),
        width: bottomTokens
            .map((token) => token.width)
            .reduce((sum, current) => sum + current)
          + (bottomTokens.length - 1) * spaceWidth,
      });
    }
  }

  return {
    [BorderLabelVariant.Abbreviation]: {
      width: factionKeyLabelWidth,
      height: glyphSettings.lineHeight,
      tokens: [{ str: faction.id, width: factionKeyLabelWidth }],
    },
    [BorderLabelVariant.SingleLine]: {
      width: singleLineLabelWidth,
      height: glyphSettings.lineHeight,
      tokens: [{ str: faction.name, width: singleLineLabelWidth }],
    },
    [BorderLabelVariant.MultiLine]: multiLineLabelWidth === 0 ? undefined : {
      width: multiLineLabelWidth,
      height: glyphSettings.lineHeight * 2,
      tokens: multiLineTokens,
    },
  }
}
