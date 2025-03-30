/**
 * Converts a hexadecimal RGB color string to numeric color channels with values in the [0, 1] range.
 * @param rgb The color string to convert
 * @returns The separate color channels
 */
export function hexStringToRgb(rgb: string) {
  rgb = rgb.replace(/^#/, '');
  let r: number;
  let g: number;
  let b: number;
  if (rgb.length <= 4) {
    r = parseInt(rgb.substring(0, 1).repeat(2), 16);
    g = parseInt(rgb.substring(1, 2).repeat(2), 16);
    b = parseInt(rgb.substring(2, 3).repeat(2), 16);
  } else {
    r = parseInt(rgb.substring(0, 2), 16);
    g = parseInt(rgb.substring(2, 4), 16);
    b = parseInt(rgb.substring(4, 6), 16);
  }
  // make sure the color channels are in the [0, 1] range
  r /= 255;
  g /= 255;
  b /= 255;
  return { r, g, b };
}
