import { GlyphConfig, Rectangle2d, RectangleGrid, System, SystemLabelConfig } from '../../common';
import { findLabelPosition, initializeLabelItems } from './functions';

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
  grid: RectangleGrid,
  glyphSettings: GlyphConfig,
  systemLabelConfig: SystemLabelConfig,
) {
  const { labelItems } = initializeLabelItems(
    viewRect,
    eraIndex,
    systems,
    grid,
    glyphSettings,
    systemLabelConfig,
  );

  // sort label items from right to left
  labelItems.sort((a, b) => b.anchor.x - a.anchor.x);

  labelItems.forEach((labelItem) => {
    // find final label position
    grid.unplaceItem(labelItem);
    findLabelPosition(labelItem, viewRect, grid, glyphSettings, systemLabelConfig);
    grid.placeItem(labelItem);
  });

  return labelItems;
}
