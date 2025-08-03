/**
 * From a potentially lengthy, multi-part affiliation string, this function extracts only the main
 * border state affiliation.
 *
 * @param fullAffiliation The full affiliation string
 * @param ignoredAffiliations The affiliations to ignore (and return empty strings for instead)
 * @param parseHiddenSystemsAs What to do with hidden systems: Ignore them completely, return only the faction, or return the full affiliation string
 * @returns The state affiliation, or empty string for systems that are irrelevant for state borders
 */
export function extractBorderStateAffiliation(
  fullAffiliation: string,
  ignoredAffiliations = ['', 'A', 'U'],
  parseHiddenSystemsAs: 'ignore' | 'faction' | 'full' = 'ignore',
) {
  const [, stateAff, , additionalAff] = (fullAffiliation || '')
    .trim()
    .match(/^(\w+)\s*(\(([^)]+)\))?/i) || [];

  if (ignoredAffiliations.includes(stateAff) || (additionalAff === 'H' && parseHiddenSystemsAs === 'ignore')) {
    return '';
  } else if (stateAff === 'D') {
    // disputed systems
    if (additionalAff) {
      return [stateAff, ...additionalAff.split(',')].join('-');
    }
    return stateAff;
  } else if (additionalAff === 'H') {
    return parseHiddenSystemsAs === 'faction' ? stateAff : stateAff + '(H)';
  } else if (additionalAff) {
    return additionalAff;
  } else {
    return stateAff;
  }
}
