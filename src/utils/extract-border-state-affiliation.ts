/**
 * From a potentially lengthy, multi-part affiliation string, this function extracts only the main
 * border state affiliation.
 * 
 * @returns The state affiliation, or empty string for systems that are irrelevant for state borders
 */
export function extractBorderStateAffiliation(fullAffiliation: string) {
  const [, stateAff, , additionalAff] = (fullAffiliation
    .split(',')
    .shift() || '')
    .match(/(\w+)\s*(\(([^)]+)\))?/i) || [];

  if (additionalAff === 'H') {
    return '';
  } else if (additionalAff) {
    return additionalAff;
  } else if (stateAff && stateAff !== 'A' && stateAff !== 'U') {
    return stateAff;
  } else {
    return '';
  }
}