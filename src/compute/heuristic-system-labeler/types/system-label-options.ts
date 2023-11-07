import { Point2d } from '../../../common';

export interface SystemLabelOverrideConfig {
  position: {
    x: 'center' | 'left' | 'right';
    y: 'center' | 'top' | 'bottom';
  }
  delta?: Point2d;
  connector?: boolean | Array<Point2d>;
}

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

export interface SystemLabelOptions {
  defaultGlyphWidth: number;
  labelPadding: {
    x: number;
    y: number;
  };
  labelMargin: SystemLabelMarginOptions;
  systemLabelOverrides: Record<string, Array<SystemLabelOverrideConfig>>;
}
