import { hexStringToRgb } from './hex-string-to-rgb';

/**
 * Converts an RGB value to HSV
 *
 * @param rgb RGB(A) in hexadecimal format
 */
export function rgbToHsv(rgb: string) {
  let { r, g, b } = hexStringToRgb(rgb);
  const cMax = Math.max(r, g, b);
  const cMin = Math.min(r, g, b);
  const delta = cMax - cMin;
  const h = delta === 0
    ? 0
    : (Math.round(
      360 * (
        cMax === r
          ? ((g - b)  / delta) % 6
          : cMax === g
            ? ((b - r) / delta) + 2
            : ((r - g) / delta) + 4
      ) / 6
    ) + 360) % 360;
  const s = cMax === 0 ? 0 : Math.round(100 * delta / cMax);
  return { h, s, v: Math.round(cMax * 100) };
}
