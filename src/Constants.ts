import { Rectangle2d } from './common';

export enum SnapPosition {
    TopLeft = 'top left',
    TopMiddle = 'top middle',
    TopRight = 'top right',
    CenterLeft = 'center left',
    DeadCenter = 'dead center',
    CenterRight = 'center right',
    BottomLeft = 'bottom left',
    BottomMiddle = 'bottom middle',
    BottomRight = 'bottom right'
}

export const UNIVERSE_RECT: Rectangle2d = {
  anchor: {
    x: -2000,
    y: -2000,
  },
  dimensions: {
    width: 4000,
    height: 4000,
  }
}
