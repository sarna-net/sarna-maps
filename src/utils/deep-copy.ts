/**
 * Deep copy a JS object
 *
 * @param o The object to copy
 * @returns The copy
 */
export default function deepCopy<T>(o: any): T {
  return JSON.parse(JSON.stringify(o));
}
