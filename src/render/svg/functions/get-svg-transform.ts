import { Dimensions2d, Point2d } from '../../../common';

/**
 * Calculates the scale and translate properties for the svg transformation of a map layer
 *
 * @param pixelDimensions The dimensions of the map excerpt in pixels
 * @param mapUnitDimensions The dimensions of the map excerpt in map units
 * @param mapFocusPoint The map's center point in map coordinates
 */
export function getSvgTransform(
  pixelDimensions: Dimensions2d,
  mapUnitDimensions: Dimensions2d,
  mapFocusPoint: Point2d,
) {
  return {
    scale: Math.min(pixelDimensions.width, pixelDimensions.height) /
      Math.min(mapUnitDimensions.width, mapUnitDimensions.height),
    translate:
      (-mapFocusPoint.x).toFixed(2) + 'px,'
      + (mapFocusPoint.y + mapUnitDimensions.height).toFixed(2) + 'px',
  };
}
