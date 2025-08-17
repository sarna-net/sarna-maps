import { hexStringToRgb } from './hex-string-to-rgb';

/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in [0, 255] and
 * returns h in [0, 360], and s and l in [0, 1].
 *
 * @see https://stackoverflow.com/a/9493060/1817602
 *
 * @param rgb RGB(A) in hexadecimal format
 * @returns The HSL representation
 */
export function rgbToHsl(rgb: string) {
  const { r, g, b } = hexStringToRgb(rgb);
  const vMax = Math.max(r, g, b);
  const vMin = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (vMax + vMin) / 2;

  if (vMax === vMin) {
    return { h: 0, s: 0, l }; // achromatic
  }

  const d = vMax - vMin;
  s = l > 0.5 ? d / (2 - vMax - vMin) : d / (vMax + vMin);
  if (vMax === r) {
    h = (g - b) / d + (g < b ? 6 : 0);
  }
  if (vMax === g) {
    h = (b - r) / d + 2;
  }
  if (vMax === b) {
    h = (r - g) / d + 4;
  }
  h /= 6;

  return { h: Math.round(h * 360), s, l };
}
