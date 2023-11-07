/**
 * From a potentially lengthy, multi-part affiliation string, this function extracts only the main
 * border state affiliation.
 *
 * @returns The state affiliation, or empty string for systems that are irrelevant for state borders
 */
export function extractBorderStateAffiliation(
  fullAffiliation: string,
  ignoredAffiliations = ['', 'A', 'U'],
  ignoreHidden = true,
) {
  const [, stateAff, , additionalAff] = (fullAffiliation || '')
    .trim()
    .match(/^(\w+)\s*(\(([^)]+)\))?/i) || [];

  if (ignoredAffiliations.includes(stateAff) || (additionalAff === 'H' && ignoreHidden)) {
    return '';
  } else if (stateAff === 'D') {
    // disputed systems
    if (additionalAff) {
      return [stateAff, ...additionalAff.split(',')].join('-');
    }
    return stateAff;
  } else if (additionalAff) {
    return additionalAff;
  } else {
    return stateAff;
  }
}
