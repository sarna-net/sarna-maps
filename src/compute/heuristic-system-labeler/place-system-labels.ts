import { GlyphCollection, Rectangle2d, System } from '../../common';
import { findLabelPosition, initializeLabelItems } from './functions';
import { SystemLabelOptions } from './types';

// TODO put these options in a config file
const DEFAULT_SYSTEM_LABEL_OPTIONS: SystemLabelOptions = {
  // defaultLabelMargin: 0.3,
  defaultGlyphWidth: 1,
  labelPadding: {
    x: 0.25,
    y: 0.2,
  },
  labelMargin: {
    regular: {
      top: 0,
      right: 0.3,
      bottom: 0.75,
      left: 0.3,
    },
    factionCapital: {
      top: 1,
      right: 1.2,
      bottom: 1.25,
      left: 1.2,
    },
    majorCapital: {
      top: 0.75,
      right: 0.7,
      bottom: 1,
      left: 0.7,
    },
  },
  systemLabelOverrides: {},
};

/**
 * Runs a heuristic algorithm in order to place system labels on a canvas with minimal overlap.
 *
 * Algorithm idea:
 * While going from right to left and greedily picking the first 0-collision label position:
 * - try label positions directly right, above, below, left of the system, with r/1.5 units of tolerance (adjust for detected collision)
 * - try collision-adjusted positions right, above, below, left beyond tolerance up to maximum adjustment range
 * - if none of the position options can be used without collision, choose option with lowest collision value
 * - positions outside the viewRect are completely invalid
 *
 * Note that coordinate system origin is considered to be bottom left. Each rectangle's origin is also
 * at the rectangle's bottom left corner.
 */
export function placeSystemLabels(
  viewRect: Rectangle2d,
  eraIndex: number,
  systems: Array<System>,
  glyphSettings: GlyphCollection,
  labelOptions?: Partial<SystemLabelOptions>
) {
  const options = {
    ...DEFAULT_SYSTEM_LABEL_OPTIONS,
    ...(labelOptions || {}),
  } as SystemLabelOptions;

  const { grid, labelItems } = initializeLabelItems(
    viewRect,
    eraIndex,
    systems,
    glyphSettings,
    options,
  );

  // sort label items from right to left
  labelItems.sort((a, b) => b.anchor.x - a.anchor.x);

  labelItems.forEach((labelItem) => {
    // find final label position
    grid.unplaceItem(labelItem);
    findLabelPosition(labelItem, viewRect, grid, glyphSettings, options);
    grid.placeItem(labelItem);
  });

  return labelItems;
}
