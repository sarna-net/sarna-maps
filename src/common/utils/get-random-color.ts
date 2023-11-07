/**
 * Returns a random item from a predefined list of hexadecimal RGB colors
 */
export function getRandomColor() {
  const colors = [
    '#c00',
    '#0c0',
    '#00c',
    '#dc0',
    '#c0c',
    '#0cc',
    '#c80',
    '#50f',
    '#060',
    '#666',
    '#533',
    '#000',
    '#ccc',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
