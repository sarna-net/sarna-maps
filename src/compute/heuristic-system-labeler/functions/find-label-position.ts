import {
  GlyphCollection,
  Rectangle2d,
  RectangleGrid
} from '../../../common';
import { SystemLabelOptions } from '../types';
import { LabelRectangle } from '../../types';
import { findBestLabelPosition } from './find-best-label-position';
import { applyManualLabelPlacement } from './apply-manual-label-placement';

/**
 * Modifies the label item's anchor point and places the label, either according to a manual configuration or
 * automatically.
 *
 * @param labelItem The label item to place
 * @param viewRect The map bounds (labels cannot be placed outside)
 * @param grid The rectangle grid for collision checking
 * @param glyphSettings The set of glyph settings for the currently used font
 * @param options Label options
 */
export function findLabelPosition(
  labelItem: LabelRectangle,
  viewRect: Rectangle2d,
  grid: RectangleGrid,
  glyphSettings: GlyphCollection,
  options: SystemLabelOptions,
) {
  // If there is a manual placement definition for the current system, use it to attempt to place the label,
  const manualPlacement = options.systemLabelOverrides[labelItem.label || ''];
  if (manualPlacement) {
    applyManualLabelPlacement(labelItem, manualPlacement, viewRect, glyphSettings);
  }
  // If, possibly after attempting manual placement, the label is still marked as unprocessed, run it through the
  // heuristic algorithm
  if (!labelItem.processed) {
    findBestLabelPosition(labelItem, viewRect, grid, glyphSettings);
  }
}
