import { Rectangle2d, System } from '../../../common';

export function restrictSystemsToViewbox(viewBox: Rectangle2d, systems: Array<System>) {
  const viewBoxBounds = {
    left: viewBox.anchor.x,
    top: viewBox.anchor.y + viewBox.dimensions.height,
    right: viewBox.anchor.x + viewBox.dimensions.width,
    bottom: viewBox.anchor.y
  };
  return [...systems].filter((system) => {
    const systemBounds = {
      left: system.x - system.radiusX,
      top: system.y + system.radiusY,
      right: system.x + system.radiusX,
      bottom: system.y - system.radiusY,
    };
    return systemBounds.left <= viewBoxBounds.right
      && systemBounds.right >= viewBoxBounds.left
      && systemBounds.bottom <= viewBoxBounds.top
      && systemBounds.top >= viewBoxBounds.bottom;
  });
}
