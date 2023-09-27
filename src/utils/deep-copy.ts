/**
 * Deep copy a JS object
 *
 * @param o The object to copy
 * @returns The copy
 */
export function deepCopy<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}
