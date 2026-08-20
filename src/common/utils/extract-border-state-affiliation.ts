import { traceFaction } from '../../common/utils/faction-traversal-logger';
import { getFactionAffiliationPair } from '../../read/common/retain-faction-affiliation-pairing';

const FILE_NAME = 'extract-border-state-affiliation.ts';

const BORDER_STATE_REGEX = /^([A-Za-z0-9\-]+)(?:\|[^,]+)?\s*(\(([^)]+)\))?/i;

const V3_PIPE_REGEX = /^([A-Za-z]+)\|Region\s+\d+$/i;

function detectV3Format(affiliation: string): boolean {
  return V3_PIPE_REGEX.test(affiliation.trim());
}

function extractV3FactionPrefix(affiliation: string): string | null {
  const match = affiliation.trim().match(V3_PIPE_REGEX);
  return match ? match[1] : null;
}

function tryExtractFactionFromAnyFormat(input: string): string | null {
  if (!input) return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  if (detectV3Format(trimmed)) {
    const prefix = extractV3FactionPrefix(trimmed);
    if (prefix) return prefix;
  }

  const commaMatch = trimmed.match(/^([A-Za-z0-9\-]+)/);
  if (commaMatch) return commaMatch[1];

  return null;
}

/**
 * Extracts the main border state affiliation from a full affiliation string
 */
export function extractBorderStateAffiliation(
  fullAffiliation: string,
  ignoredAffiliations = ['', 'A', 'U'],
  parseHiddenSystemsAs: 'ignore' | 'faction' | 'full' = 'ignore',
  levels = 1,
  removeCapitalTokens = false,

  systemId?: string,
  eraIndex?: number,
) {

  const trimmedAffiliation = (fullAffiliation || '').trim();

  if (detectV3Format(trimmedAffiliation)) {
    const v3Prefix = extractV3FactionPrefix(trimmedAffiliation);
    traceFaction(FILE_NAME, 'V3_FORMAT_DETECTED', `original="${trimmedAffiliation}", prefix="${v3Prefix}"`);
  }

  if (removeCapitalTokens) {
    fullAffiliation = fullAffiliation.replace(/,(faction|minor|major)\s+capital/ig, '');
  }

  const match = (fullAffiliation || '').trim().match(BORDER_STATE_REGEX) || [];
  const [, stateAff, , additionalAff] = match;

  if (!stateAff && trimmedAffiliation) {
    traceFaction(
      FILE_NAME,
      'REGEX_NO_MATCH',
      `input="${trimmedAffiliation}", v3_format=${detectV3Format(trimmedAffiliation)}`
    );
  }

  const result: Array<string> = [];

  // --- Decision Branches ---
  if (stateAff === 'A' && additionalAff && !additionalAff.startsWith('D')) {
    result.push(additionalAff);
  } else if (stateAff === 'U' || (additionalAff === 'H' && parseHiddenSystemsAs === 'ignore')) {
    result.push('');
  } else if (ignoredAffiliations.includes(stateAff)) {
    result.push('');
  } else if (stateAff === 'D') {
    if (additionalAff) {
      const combined = [stateAff, ...additionalAff.split(',')].join('-');
      traceFaction(FILE_NAME, 'DISPUTED COMBINED', combined);
      result.push(combined);
    } else {
      result.push(stateAff);
    }
  } else if (additionalAff === 'H') {
    const value =
      parseHiddenSystemsAs === 'faction'
        ? stateAff
        : stateAff + '(H)';

    result.push(value);
  } else if (additionalAff) {
    // FIX: Always use primary faction (stateAff), not secondary region info
    // This creates cohesive faction territories instead of fragmented pockets
    result.push(stateAff);
  } else {
    result.push(stateAff);
  }

  let finalResult = result.join(',');

  let explicitlyCleared = false;

  if (parseHiddenSystemsAs === 'ignore' && trimmedAffiliation && trimmedAffiliation.includes('(H)')) {
    finalResult = '';
    explicitlyCleared = true;
    traceFaction(FILE_NAME, 'HIDDEN_IGNORED', 'hidden system in ignore mode');
  }

  let pair: ReturnType<typeof getFactionAffiliationPair> = null;
  let fallbackResult: string | null = null;

  if (!explicitlyCleared && finalResult && trimmedAffiliation && (!stateAff || ignoredAffiliations.includes(stateAff))) {
    const extracted = tryExtractFactionFromAnyFormat(trimmedAffiliation);
    if (extracted) {
      if (!ignoredAffiliations.includes(extracted)) {
        finalResult = extracted;
        traceFaction(FILE_NAME, 'UNIVERSAL_EXTRACT', `extracted="${extracted}" from any format`);
      } else {
        traceFaction(FILE_NAME, 'UNIVERSAL_EXTRACT_IGNORED', `extracted="${extracted}" is ignored`);
        finalResult = '';
      }
    }
  }

  // --- Additional Levels ---
  if (levels > 1) {
    const remaining = fullAffiliation.replace(BORDER_STATE_REGEX, '');
    const allAffiliations = remaining.split(',');

    for (let currentLevel = 1; currentLevel < levels; currentLevel++) {
      if (allAffiliations.length > currentLevel) {
        const levelValue = allAffiliations[currentLevel].trim();
        if (levelValue) {
          finalResult += ',' + levelValue;
        }
      }
    }
  }

  if (systemId !== undefined && eraIndex !== undefined) {
    pair = getFactionAffiliationPair(systemId, eraIndex);

    if (pair) {
      traceFaction(
        FILE_NAME,
        'PAIRING LOOKUP',
        `${pair.systemName}(${systemId}):${eraIndex}:${pair.normalizedAffiliation}:${pair.faction ? pair.faction.id : 'NULL'}:${pair.resolutionStatus}`
      );

      if (pair.faction) {
        if (pair.normalizedAffiliation && pair.normalizedAffiliation !== finalResult) {
          traceFaction(
            FILE_NAME,
            'PAIRING OVERRIDE',
            `${pair.systemName}(${systemId}):${finalResult} -> ${pair.normalizedAffiliation}`
          );
          finalResult = pair.normalizedAffiliation;
        }
      } else {
        traceFaction(
          FILE_NAME,
          'PAIRING FACTION_NULL',
          `${pair.systemName}(${systemId}):status=${pair.resolutionStatus},raw=${pair.rawAffiliation},normalized=${pair.normalizedAffiliation}`
        );

        if (detectV3Format(pair.rawAffiliation)) {
          const v3Prefix = extractV3FactionPrefix(pair.rawAffiliation);
          if (v3Prefix) {
            fallbackResult = v3Prefix;
            traceFaction(FILE_NAME, 'V3_FALLBACK', `using prefix="${v3Prefix}" from v3 format`);
          }
        }

        if (!fallbackResult && pair.rawAffiliation) {
          const commaParts = pair.rawAffiliation.split(',');
          if (commaParts.length > 0 && commaParts[0].trim()) {
            fallbackResult = commaParts[0].trim();
            traceFaction(FILE_NAME, 'COMMA_FALLBACK', `using first part="${fallbackResult}"`);
          }
        }

        if (fallbackResult && fallbackResult !== finalResult) {
          traceFaction(
            FILE_NAME,
            'FALLBACK_OVERRIDE',
            `${pair.systemName}(${systemId}):${finalResult} -> ${fallbackResult}`
          );
          finalResult = fallbackResult;
        }
      }
    } else {
      traceFaction(
        FILE_NAME,
        'PAIRING MISSING',
        `${systemId}_${eraIndex}`
      );

      if (detectV3Format(trimmedAffiliation)) {
        const v3Prefix = extractV3FactionPrefix(trimmedAffiliation);
        if (v3Prefix) {
          fallbackResult = v3Prefix;
          traceFaction(FILE_NAME, 'V3_DIRECT_FALLBACK', `no pairing, using v3 prefix="${v3Prefix}"`);
          finalResult = fallbackResult;
        }
      }
    }
  } else {
    if (finalResult && finalResult !== '') {
      traceFaction(FILE_NAME, 'PAIRING SKIPPED',
        `systemId=${systemId}, eraIndex=${eraIndex}, affiliation=${finalResult}`);
    }

    if (!explicitlyCleared && !finalResult && trimmedAffiliation) {
      const extracted = tryExtractFactionFromAnyFormat(trimmedAffiliation);
      if (extracted) {
        if (!ignoredAffiliations.includes(extracted)) {
          finalResult = extracted;
          traceFaction(FILE_NAME, 'UNIVERSAL_EXTRACT_SKIP', `no systemId/eraIndex, extracted="${extracted}"`);
        } else {
          traceFaction(FILE_NAME, 'UNIVERSAL_EXTRACT_SKIP_IGNORED', `extracted="${extracted}" is ignored`);
          finalResult = '';
        }
      }
    }
  }

  traceFaction(FILE_NAME, 'FINAL RESULT', `${pair?.systemName || ''}(${systemId}):${finalResult}`);

  return finalResult;
}