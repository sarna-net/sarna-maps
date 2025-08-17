import { Point2d } from '../math-2d';

/**
 * The margin configuration for the different kinds of system labels
 */
export interface SystemLabelMarginOptions {
  regular: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  },
  factionCapital?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  },
  majorCapital?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  },
  minorCapital?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  }
}

/**
 * A manual system label configuration (for a single system) that overrides
 * the automatic placement algorithm.
 */
export interface SystemLabelOverrideConfig {
  /**
   * The label's position relative to the system, in the horizontal and vertical direction
   */
  position: {
    x: 'center' | 'left' | 'right';
    y: 'center' | 'top' | 'bottom';
  }
  /**
   * The (additional) x and y offset for the label
   */
  delta?: Point2d;
  /**
   * The override label can be visually connected to its system with one or more lines
   * called connectors.
   * Use either true to draw a line from the (manually placed) label to the system, or an
   * array of waypoints for the connector line
   */
  connector?: boolean | Array<Point2d>;
}

/**
 * The configuration object for system labels
 */
export interface SystemLabelConfig {
  /**
   * The margin configuration for the different kinds of system labels
   */
  margins: SystemLabelMarginOptions;
  /**
   * The padding offset (in x and y direction) for all system labels
   */
  padding: Point2d;
  /**
   * A map of system label overrides, where the key is the system name and the value
   * is a list of label placement overrides for this system.
   * The first override label that fits into the viewport will be used.
   */
  overrides: Record<string, Array<SystemLabelOverrideConfig>>;
}
