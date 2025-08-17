import {
  copyPointCoordinates,
  GlyphConfig,
  Point2d,
  Rectangle2d,
  RectangleGrid
} from '../../../common';
import { LabelOverlapArea } from '../types';
import { clampLabelToViewRect } from './clamp-label-to-view-rect';
import { getLabelOverlapArea } from './get-label-overlap-area';
import { LabelRectangle } from '../../types';

interface BestCandidate {
  collisionArea: number;
  anchor: Point2d;
}

/**
 * Modifies the label item's anchor point and places the label automatically.
 *
 * The algorithm is fairly simple and brute-force: It attempts to place the label at several points around the
 * system object, each time testing the label position for collisions with other objects. It returns after the first
 * position without a collision has been found. If none can be found, the function sets the label position to the
 * option with the smallest colliding / overlapping area.
 *
 * @param labelItem The label item to place
 * @param viewRect The map bounds (labels cannot be placed outside)
 * @param grid The rectangle grid for collision checking
 * @param glyphSettings The set of glyph settings for the currently used font
 */
export function findBestLabelPosition(
  labelItem: LabelRectangle,
  viewRect: Rectangle2d,
  grid: RectangleGrid,
  glyphSettings: GlyphConfig,
) {
  const systemItem = labelItem.parent;
  labelItem.processed = true;
  let alternatives: [number, number];
  const objectCenter = {
    x: systemItem.anchor.x + systemItem.dimensions.width * 0.5,
    y: systemItem.anchor.y + systemItem.dimensions.height * 0.5,
  };

  // this object will be modified by the testPlacement helper function
  const bestCandidate: BestCandidate = {
    collisionArea: Infinity,
    anchor: { x: Infinity, y: Infinity },
  };
  let collisionData: LabelOverlapArea;

  // TRY RIGHT SIDE POSITIONS
  // label to the system's right side, vertically centered
  labelItem.anchor.x = systemItem.anchor.x + systemItem.dimensions.width + labelItem.margin.left;
  labelItem.anchor.y = objectCenter.y - labelItem.dimensions.height * 0.5 + (glyphSettings.regular.baseLineOffset || 0);
  collisionData = testPlacement(labelItem, viewRect, grid, bestCandidate);
  if (bestCandidate.collisionArea === 0) {
    return;
  }
  // there is a collision, but we can try pushing the right-side label slightly up or down
  alternatives = getYAlternatives(objectCenter, collisionData, labelItem);
  labelItem.anchor.y = alternatives[0];
  testPlacement(labelItem, viewRect, grid, bestCandidate);
  if (bestCandidate.collisionArea === 0) {
    return;
  }
  labelItem.anchor.y = alternatives[1];
  testPlacement(labelItem, viewRect, grid, bestCandidate);
  if (bestCandidate.collisionArea === 0) {
    return;
  }

  // TRY TOP SIDE POSITIONS
  labelItem.anchor.x = objectCenter.x - labelItem.dimensions.width * 0.5;
  labelItem.anchor.y = systemItem.anchor.y + systemItem.dimensions.height + labelItem.margin.bottom;
  collisionData = testPlacement(labelItem, viewRect, grid, bestCandidate);
  if (bestCandidate.collisionArea === 0) {
    return;
  }
  // there is a collision, try pushing label slightly sidewards
  alternatives = getXAlternatives(systemItem, collisionData, labelItem);
  labelItem.anchor.x = alternatives[0];
  testPlacement(labelItem, viewRect, grid, bestCandidate);
  if (bestCandidate.collisionArea === 0) {
    return;
  }
  labelItem.anchor.x = alternatives[1];
  testPlacement(labelItem, viewRect, grid, bestCandidate);
  if (bestCandidate.collisionArea === 0) {
    return;
  }

  // TRY BOTTOM SIDE POSITIONS
  labelItem.anchor.x = objectCenter.x - labelItem.dimensions.width * 0.5;
  labelItem.anchor.y = systemItem.anchor.y - labelItem.dimensions.height - labelItem.margin.top;
  collisionData = testPlacement(labelItem, viewRect, grid, bestCandidate);
  if (bestCandidate.collisionArea === 0) {
    return;
  }
  // there is a collision, try pushing label slightly sidewards
  alternatives = getXAlternatives(systemItem, collisionData, labelItem);
  labelItem.anchor.x = alternatives[0];
  testPlacement(labelItem, viewRect, grid, bestCandidate);
  if (bestCandidate.collisionArea === 0) {
    return;
  }
  labelItem.anchor.x = alternatives[1];
  testPlacement(labelItem, viewRect, grid, bestCandidate);
  if (bestCandidate.collisionArea === 0) {
    return;
  }

  // TRY LEFT SIDE POSITIONS
  labelItem.anchor.x = systemItem.anchor.x - labelItem.dimensions.width - labelItem.margin.right;
  labelItem.anchor.y = objectCenter.y - labelItem.dimensions.height * 0.5 + (glyphSettings.regular.baseLineOffset || 0);
  collisionData = testPlacement(labelItem, viewRect, grid, bestCandidate);
  if (bestCandidate.collisionArea === 0) {
    return;
  }
  // there is a collision, try pushing label slightly up or down
  alternatives = getYAlternatives(objectCenter, collisionData, labelItem);
  labelItem.anchor.y = alternatives[0];
  testPlacement(labelItem, viewRect, grid, bestCandidate);
  if (bestCandidate.collisionArea === 0) {
    return;
  }
  labelItem.anchor.y = alternatives[1];
  testPlacement(labelItem, viewRect, grid, bestCandidate);
  if (bestCandidate.collisionArea === 0) {
    return;
  }

  // no collision-free option found. Use option with minimal collision.
  copyPointCoordinates(bestCandidate.anchor, labelItem.anchor);
  console.log(
    `Overlapping label: "${labelItem.label}" has an overlap of ${bestCandidate.collisionArea} units. ` +
    `Best position: ${bestCandidate.anchor.x}, ${bestCandidate.anchor.y}. ` +
    `Label position: ${labelItem.anchor.x}, ${labelItem.anchor.y}`,
  );
}

/**
 * Helper function that tests a label placement for collisions.
 */
function testPlacement(
  labelItem: LabelRectangle,
  viewRect: Rectangle2d,
  grid: RectangleGrid,
  bestCandidate: BestCandidate,
) {
  clampLabelToViewRect(labelItem, viewRect);
  const overlapArea = getLabelOverlapArea(labelItem, grid);
  if (overlapArea.area < bestCandidate.collisionArea) {
    bestCandidate.collisionArea = overlapArea.area;
    copyPointCoordinates(labelItem.anchor, bestCandidate.anchor);
  }
  return overlapArea;
}

/**
 * Helper function that returns two alternative X positions for a label, shifting it slightly to the left or right.
 */
function getXAlternatives(systemItem: Rectangle2d, collisionData: LabelOverlapArea, label: LabelRectangle) {
  const alternatives: Array<number> = [];
  // push label right
  alternatives.push(Math.min(collisionData.maxX + label.margin.left, systemItem.anchor.x));
  // push label left
  if (collisionData.minX < systemItem.anchor.x) {
    alternatives.push(Math.max(
      collisionData.minX - label.margin.right,
      systemItem.anchor.x + systemItem.dimensions.width - label.dimensions.width,
    ));
  } else {
    alternatives.push(Math.max(
      collisionData.minX - label.dimensions.width,
      systemItem.anchor.x + systemItem.dimensions.width - label.dimensions.width,
    ));
  }
  return alternatives as [number, number];
}

/**
 * Helper function that returns two alternative Y positions for a label, shifting it slightly up or down.
 */
function getYAlternatives(objectCenter: Point2d, collisionData: LabelOverlapArea, label: LabelRectangle) {
  const alternatives: Array<number> = [];
  // push label up
  alternatives.push(Math.min(collisionData.maxY, objectCenter.y - label.dimensions.height * 0.25) + label.margin.bottom);
  // push label down
  alternatives.push(
    Math.max(
      collisionData.minY - label.dimensions.height * 0.75,
      objectCenter.y - label.dimensions.height * 0.75
    ) - label.margin.top,
  );
  // try the smaller change first, swap alternatives order if necessary
  if (objectCenter.y - collisionData.minY < collisionData.maxY - objectCenter.y) {
    alternatives.reverse();
  }
  return alternatives as [number, number];
}
