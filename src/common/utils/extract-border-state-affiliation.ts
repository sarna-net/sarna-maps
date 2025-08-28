const BORDER_STATE_REGEX = /^([A-Za-z\-]+)\s*(\(([^)]+)\))?/i;

/**
 * From a potentially lengthy, multi-part affiliation string, this function extracts only the main
 * border state affiliation.
 *
 * @param fullAffiliation The full affiliation string
 * @param ignoredAffiliations The affiliations to ignore (and return empty strings for instead)
 * @param parseHiddenSystemsAs What to do with hidden systems: Ignore them completely, return only the faction, or return the full affiliation string
 * @param levels How many levels of affiliation to include in the resulting string
 * @param removeCapitalTokens Whether to remove the part of the affiliation denoting capital systems
 * @returns The state affiliation, or empty string for systems that are irrelevant for state borders
 */
export function extractBorderStateAffiliation(
  fullAffiliation: string,
  ignoredAffiliations = ['', 'A', 'U'],
  parseHiddenSystemsAs: 'ignore' | 'faction' | 'full' = 'ignore',
  levels = 1,
  removeCapitalTokens = false,
) {
  if (removeCapitalTokens) {
    fullAffiliation = fullAffiliation.replace(/,(faction|minor|major)\s+capital/ig, '');
  }

  // always evaluate the first level
  const [, stateAff, , additionalAff] = (fullAffiliation || '')
    .trim()
    .match(BORDER_STATE_REGEX) || [];

  const result: Array<string> = [];

  if (ignoredAffiliations.includes(stateAff) || (additionalAff === 'H' && parseHiddenSystemsAs === 'ignore')) {
    result.push('');
  } else if (stateAff === 'D') {
    // disputed systems
    if (additionalAff) {
      result.push([stateAff, ...additionalAff.split(',')].join('-'));
    } else {
      result.push(stateAff);
    }
  } else if (additionalAff === 'H') {
    result.push(parseHiddenSystemsAs === 'faction' ? stateAff : stateAff + '(H)');
  } else if (additionalAff) {
    result.push(additionalAff);
  } else {
    result.push(stateAff);
  }

  // get additional levels, if requested
  const allAffiliations = fullAffiliation.replace(BORDER_STATE_REGEX, '').split(',');
  for (let currentLevel = 1; currentLevel < levels; currentLevel++) {
    if (allAffiliations.length > currentLevel) {
      result.push(allAffiliations[currentLevel]);
    }
  }

  return result.join(',');
}
