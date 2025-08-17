/**
 * @param r The red channel (between 0 and 255)
 * @param g The green channel (between 0 and 255)
 * @param b The blue channel (between 0 and 255)
 */
export function rgbToHexString({ r, g, b }: { r: number; g: number; b: number }) {
  return '#' +
    r.toString(16).padStart(2, '0') +
    g.toString(16).padStart(2, '0') +
    b.toString(16).padStart(2, '0');
}
