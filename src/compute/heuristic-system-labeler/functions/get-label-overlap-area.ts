import { areaOfRectangleIntersection, RectangleGrid } from '../../../common';
import { LABEL_ID_PREFIX } from '../constants';
import { LabelOverlapArea } from '../types';
import { LabelRectangle } from '../../types';

/**
 * Helper function that returns the area the label shares with other items, excluding other labels that have yet to be
 * placed.
 *
 * @param labelItem The label currently looking to be placed
 * @param grid The collision grid
 * @param tolerance An area up to which the algorithm assumes there is no real overlap
 */
export function getLabelOverlapArea(labelItem: LabelRectangle, grid: RectangleGrid, tolerance = 0.1) {
  const overlapArea: LabelOverlapArea = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
    area: 0,
  };
  const overlappingItems = grid.getOverlaps(labelItem);
  overlappingItems.forEach((otherItem) => {
    // ignore other labels that have yet to be processed
    if (otherItem.id.startsWith(LABEL_ID_PREFIX) && !(otherItem as LabelRectangle).processed) {
      return;
    }
    overlapArea.minX = Math.min(overlapArea.minX, otherItem.anchor.x);
    overlapArea.minY = Math.min(overlapArea.minY, otherItem.anchor.y);
    overlapArea.maxX = Math.max(overlapArea.maxX, otherItem.anchor.x + otherItem.dimensions.width);
    overlapArea.maxY = Math.max(overlapArea.maxY, otherItem.anchor.y + otherItem.dimensions.height);
    overlapArea.area += areaOfRectangleIntersection(labelItem, otherItem);
  });
  // apply tolerance
  if (overlapArea.area < tolerance) {
    overlapArea.area = 0;
  }
  return overlapArea;
}
