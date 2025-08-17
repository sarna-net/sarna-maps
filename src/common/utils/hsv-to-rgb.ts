/**
 * Converts a HSV color value to a hexadecimal RGB color string
 *
 * @param h Hue, angle between 0 and 360
 * @param s Saturation, between 0 and 100
 * @param v Value, between 0 and 100
 */
export function hsvToRgb({ h, s, v }: { h: number; s: number; v: number }) {
  const s1 = s * 0.01;
  const v1 = v * 0.01;

  if (s <= 0) {
    return '#' + Math.floor(v1 * 255).toString(16).padStart(2, '0').repeat(3);
  }
  const hh = (h >= 360 ? 0 : h) / 60;
  const i = Math.floor(hh);
  const ff = hh - i;

  const p = v1 * (1 - s1);
  const q = v1 * (1 - (s1 * ff));
  const t = v1 * (1 - (s1 * (1 - ff)));

  let r: number;
  let g: number;
  let b: number;

  switch(i) {
    case 0:
      r = v1;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v1;
      b = p;
      break;
    case 2:
      r = p;
      g = v1;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v1;
      break;
    case 4:
      r = t;
      g = p;
      b = v1;
      break;
    case 5:
    default:
      r = v1;
      g = p;
      b = q;
      break;
  }
  return '#' +
    Math.floor(r * 255).toString(16).padStart(2, '0') +
    Math.floor(g * 255).toString(16).padStart(2, '0') +
    Math.floor(b * 255).toString(16).padStart(2, '0');
}
