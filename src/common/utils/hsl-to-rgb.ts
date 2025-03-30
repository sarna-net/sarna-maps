import { rgbToHexString } from './rgb-to-hex-string';

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from https://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h in the range [0, 360] and s and l in [0, 1].
 * Returns a hexadecimal RGB string.
 *
 * @see https://stackoverflow.com/a/9493060/1817602
 *
 * @param h The hue (between 0 and 360)
 * @param s The saturation (between 0 and 100)
 * @param l The lightness (between 0 and 100)
 * @returns The RGB color string
 */
export function hslToRgb({ h, s, l}: { h: number; s: number; l: number}) {
  let r, g, b;
  const h1 = h / 360;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h1 + 1/3);
    g = hueToRgb(p, q, h1);
    b = hueToRgb(p, q, h1 - 1/3);
  }

  return rgbToHexString({
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  });
}

function hueToRgb(p: number, q: number, t: number) {
  if (t < 0) { t += 1; }
  if (t > 1) { t -= 1; }
  return t < 1/6
    ? p + (q - p) * 6 * t
    : t < 1/2
      ? q
      : t < 2/3
        ? p + (q - p) * (2/3 - t) * 6
        : p;
  // if (t < 1/6) { return p + (q - p) * 6 * t; }
  // if (t < 1/2) { return q; }
  // if (t < 2/3) { return p + (q - p) * (2/3 - t) * 6 }
  // return p;
}
