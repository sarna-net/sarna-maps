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
      left: system.x - (system.radiusX || 1),
      top: system.y + (system.radiusY || 1),
      right: system.x + (system.radiusX || 1),
      bottom: system.y - (system.radiusY || 1),
    };
    return systemBounds.left <= viewBoxBounds.right
      && systemBounds.right >= viewBoxBounds.left
      && systemBounds.bottom <= viewBoxBounds.top
      && systemBounds.top >= viewBoxBounds.bottom;
  });
}
