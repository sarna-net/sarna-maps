import { clampNumber, Rectangle2d } from '../../../common';
import { LabelRectangle } from '../../types';

/**
 * Helper function that fits a label into the visible coordinates, as defined by the viewRect.
 *
 * @param labelItem The label item (will be modified)
 * @param viewRect The view rect
 */
export function clampLabelToViewRect(labelItem: LabelRectangle, viewRect: Rectangle2d) {
  labelItem.anchor.x = clampNumber(
    labelItem.anchor.x,
    viewRect.anchor.x,
    viewRect.anchor.x + viewRect.dimensions.width - labelItem.dimensions.width,
  );
  labelItem.anchor.y = clampNumber(
    labelItem.anchor.y,
    viewRect.anchor.y,
    viewRect.anchor.y + viewRect.dimensions.height - labelItem.dimensions.height,
  );
}
