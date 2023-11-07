import {
  extractBorderStateAffiliation,
  GlyphCollection,
  IdentifiableRectangle,
  Rectangle2d,
  RectangleGrid,
  System,
} from '../../../common';
import { SystemLabelMarginOptions, SystemLabelOptions } from '../types';
import { LABEL_ID_PREFIX } from '../constants';
import { LabelAddition, LabelRectangle } from '../../types';

/**
 * Init function: Create two identifiable rectangle items for each system - one for the system itself, and one
 * for its label, and initialize the label position in the default spot (directly to the right of the system).
 * Then, add both items to a rectangle grid.
 *
 * @param viewRect The bounds of the image to generate (labels cannot be placed outside)
 * @param eraIndex The displayed era's index
 * @param systems The list of systems (includes clusters)
 * @param glyphSettings The glyph settings for the regular sized font
 * @param options The label options
 * @returns The collision grid and the system and label rectangular items
 */
export function initializeLabelItems(
  viewRect: Rectangle2d,
  eraIndex: number,
  systems: Array<System>,
  glyphSettings: GlyphCollection,
  options: SystemLabelOptions,
) {
  // Create a rectangle grid that will let us check for label collisions
  const grid = new RectangleGrid(viewRect);

  // Create the rectangular system and label items
  const systemItems: Array<IdentifiableRectangle> = [];
  const labelItems: Array<LabelRectangle> = [];
  systems.forEach((system) => {
    const systemName = system.eraNames[eraIndex];
    const systemAffiliation = extractBorderStateAffiliation(system.eraAffiliations[eraIndex], ['']);
    const additions = getLabelAdditions(system, eraIndex);
    const labelMargin = getLabelMargin(system, eraIndex, options.labelMargin);

    // determine label dimensions
    let labelWidth = options.labelPadding.x * 2;
    for (let i = 0; i < systemName.length; i++) {
      labelWidth += glyphSettings.regular.widths[systemName[i]] ||
        glyphSettings.regular.widths['default'] ||
        options.defaultGlyphWidth;
    }
    let labelHeight = glyphSettings.regular.lineHeight + options.labelPadding.y * 2;
    additions.forEach((addition, labelIndex) => {
      labelHeight += glyphSettings.small.lineHeight;
      addition.delta.y = (additions.length - 1 - labelIndex) * glyphSettings.small.lineHeight;
      let labelAdditionsWidth = 0;
      for (let i = 0; i < addition.text.length; i++) {
        labelAdditionsWidth += glyphSettings.small.widths[addition.text[i]] || glyphSettings.small.widths.defaultWidth;
      }
      labelWidth = Math.max(labelWidth, labelAdditionsWidth);
    });

    // create and initialize grid items (one for the system itself and one for the label)
    const systemItem = {
      id: system.id,
      anchor: {
        x: system.x - system.radiusX,
        y: system.y - system.radiusY,
      },
      dimensions: {
        width: system.radiusX * 2,
        height: system.radiusY * 2,
      },
    };
    const labelItem: LabelRectangle = {
      id: LABEL_ID_PREFIX + system.id,
      label: system.eraNames[eraIndex],
      anchor: {
        x: system.x,
        y: system.y,
      },
      delta: {
        x: 0,
        y: additions.length * glyphSettings.small.lineHeight,
      },
      dimensions: {
        width: labelWidth,
        height: labelHeight,
      },
      parent: systemItem,
      processed: false,
      padding: options.labelPadding,
      margin: labelMargin,
      affiliation: systemAffiliation,
      additions: additions,
    };
    systemItems.push(systemItem);
    labelItems.push(labelItem);
    if (!system.isCluster) {
      grid.placeItem(systemItem);
    }
    grid.placeItem(labelItem)
  });
  return { grid, systemItems, labelItems };
}

function getLabelMargin(system: System, eraIndex: number, marginOptions: SystemLabelMarginOptions) {
  const capitalLevel = system.eraCapitalLevels[eraIndex];
  return capitalLevel === 1 && marginOptions.factionCapital
    ? { ...marginOptions.factionCapital }
    : capitalLevel === 2 && marginOptions.majorCapital
    ? { ...marginOptions.majorCapital }
    : capitalLevel === 3 && marginOptions.minorCapital
    ? { ...marginOptions.minorCapital }
    : { ...marginOptions.regular };
}

function getLabelAdditions(system: System, eraIndex: number) {
  const capitalLevel = system.eraCapitalLevels[eraIndex];
  const additions: Array<LabelAddition> = [];
  if (capitalLevel === 1) {
    additions.push({
      text: 'faction capital',
      class: 'capital faction',
      delta: { x: 0, y: 0 },
    });
  } else if (capitalLevel === 2) {
    additions.push({
      text: 'major capital',
      class: 'capital major',
      delta: { x: 0, y: 0 },
    });
  } else if (capitalLevel === 3) {
    additions.push({
      text: 'minor capital',
      class: 'capital minor',
      delta: { x: 0, y: 0 },
    });
  }
  return additions;
  // if (!!system.hidden) {
  //   additions.push({
  //     text: 'hidden (' + this.factions[obj.col].longName + ')',
  //     class: 'hidden'
  //   });
  // }
  // if ((system.status || '').toLowerCase() === 'apocryphal') {
  //   additions.push({
  //     text: 'apocryphal',
  //     class: 'apocryphal'
  //   });
  // }
}
