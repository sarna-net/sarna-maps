import { LabelRectangle } from '../../types';
import {
  GlyphCollection,
  Logger,
  nearestPointOnEllipsePerimeter,
  nearestPointOnRectanglePerimeter,
  Point2d,
  Rectangle2d,
} from '../../../common';
import { SystemLabelOverrideConfig } from '../types';

/**
 * Attempts to set the label's position according to what is defined in the provided manual configuration (including
 * connector lines). Sets the label's processed property to true if the manual config can be applied successfully.
 *
 * @param label The label item
 * @param configs The array of manual configuration objects, in the order they will be attempted to be applied
 * @param viewRect The view bounds (label can only be placed if fully inside)
 * @param glyphSettings The set of settings for the currently used font
 */
export function applyManualLabelPlacement(
  label: LabelRectangle,
  configs: Array<SystemLabelOverrideConfig>,
  viewRect: Rectangle2d,
  glyphSettings: GlyphCollection,
) {
  // Try placing the label according to each of the manual configs, until the first one that fits into the current
  // viewport.
  for (let i = 0; i < configs.length; i++) {
    applySingleManualConfig(label, configs[i], glyphSettings);
    if (
      label.anchor.x >= viewRect.anchor.x &&
      label.anchor.x + label.dimensions.width <= viewRect.anchor.x + viewRect.dimensions.width &&
      label.anchor.y >= viewRect.anchor.y &&
      label.anchor.y + label.dimensions.height <= viewRect.anchor.y + viewRect.dimensions.height
    ) {
      label.processed = true;
      return;
    } else {
      delete label.connectorPoints;
    }
  }
}

function applySingleManualConfig(
  label: LabelRectangle,
  config: SystemLabelOverrideConfig,
  glyphSettings: GlyphCollection,
) {
  const systemItem = label.parent;

  // generate real positions from shorthands
  switch (config.position.x.toLowerCase()) {
    case 'left':
      label.anchor.x = systemItem.anchor.x - label.dimensions.width - label.margin.right;
      break;
    case 'center':
      label.anchor.x = systemItem.anchor.x + systemItem.dimensions.width * 0.5 - label.dimensions.width * 0.5;
      break;
    case 'right':
    default:
      label.anchor.x = systemItem.anchor.x + systemItem.dimensions.width + label.margin.left;
  }
  switch (config.position.y.toLowerCase()) {
    case 'top':
      label.anchor.y = systemItem.anchor.y + systemItem.dimensions.height + label.margin.bottom;
      break;
    case 'bottom':
      label.anchor.y = systemItem.anchor.y - label.dimensions.height - label.margin.top;
      break;
    case 'center':
    default:
      label.anchor.y = systemItem.anchor.y + systemItem.dimensions.width * 0.5
        - label.dimensions.height * 0.5 + (glyphSettings.regular.baseLineOffset || 0);
  }

  // apply deltas
  if (config.delta !== undefined) {
    label.anchor.x += config.delta.x;
    label.anchor.y += config.delta.y;
  }

  // connector
  if (!!config.connector) {
    label.connectorPoints = [];
    const ellipseCenter = {
      x: systemItem.anchor.x + systemItem.dimensions.width * 0.5,
      y: systemItem.anchor.y + systemItem.dimensions.height * 0.5,
    };
    const ellipse = {
      center: ellipseCenter,
      radiusX: systemItem.dimensions.width * 0.5,
      radiusY: systemItem.dimensions.height * 0.5,
    };
    // If the connector config is set to true, a direct line is drawn from
    // the object to the label.
    if (config.connector === true) {
      const pointOnPerimeter = nearestPointOnEllipsePerimeter(
        {
          x: label.anchor.x + label.dimensions.width * 0.5,
          y: label.anchor.y + label.dimensions.height * 0.5,
        },
        ellipse,
      ) as Point2d;
      label.connectorPoints.push(pointOnPerimeter);
      label.connectorPoints.push(getLabelConnectionPoint(label, pointOnPerimeter));
    }

    // Additional connection points are placed between the object and the label. In the case of a single
    // additional point, the connector line consists of two line parts, with the first going from
    // the object to the connection point (p1 -> p2), and the second going from
    // the connection point to the label (p2 -> p3).
    // In the case of multiple additional connection points, the line segments are extended
    // following the same logic.
    if (config.connector && (config.connector as Array<Point2d>).length > 0) {
      // The connector points are defined in relation to the system / cluster's center point. In order to get the final
      // points in global coordinates, add these "deltas" to the center coordinates.
      label.connectorPoints.push(...(config.connector as Array<Point2d>).map((delta) => ({
        x: ellipseCenter.x + delta.x,
        y: ellipseCenter.y + delta.y,
      })));
      // Add the starting and end points
      const pointOnPerimeter = nearestPointOnEllipsePerimeter(label.connectorPoints[0], ellipse);
      if (!pointOnPerimeter) {
        Logger.error(`Cannot connect label for ${label.label}: Nearest point on ellipse perimeter not found`);
      } else {
        label.connectorPoints.unshift(pointOnPerimeter);
      }
      label.connectorPoints.push(
        getLabelConnectionPoint(label, label.connectorPoints[label.connectorPoints.length - 1]),
      );
    }
  }
}


function getLabelConnectionPoint(label: LabelRectangle, connPoint: Point2d): Point2d {
  if (label.anchor.y <= connPoint.y && label.anchor.y + label.dimensions.height >= connPoint.y) {
    // connection point is (vertically) between label baseline and label topline
    // --> flat (0°) horizontal line from label to connection point
    const labelEdgePoint = {
      x: 0,
      y: connPoint.y
    };
    if (label.anchor.x > connPoint.x) {
      // label is to the right of the connection point
      // --> attach to label's left side
      labelEdgePoint.x = label.anchor.x;
    } else {
      // label is to the left of the connection point
      // --> attach to label's right side
      labelEdgePoint.x = label.anchor.x + label.dimensions.width;
    }
    return labelEdgePoint;
  } else if (label.anchor.x <= connPoint.x && label.anchor.x + label.dimensions.width >= connPoint.x) {
    // connection point is between label's left side and right side
    // --> vertical line (90°) from label to connection point
    const labelEdgePoint = {
      x: connPoint.x,
      y: 0,
    };
    if (label.anchor.y > connPoint.y) {
      // label is above connection point
      // --> attach to label's bottom
      labelEdgePoint.y = label.anchor.y;
    } else {
      // label is below connection point
      // --> attach to label's top
      labelEdgePoint.y = label.anchor.y + label.dimensions.height;
    }
    return labelEdgePoint;
  } else {
    // connection point is both horizontally and vertically offset from label
    // --> just draw a direct line from the connection point to the label bounding box
    return nearestPointOnRectanglePerimeter(connPoint, label);
  }
}
