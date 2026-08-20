import { traceFaction } from './faction-traversal-logger';
import { getFactionAffiliationPair } from '../../read/common/retain-faction-affiliation-pairing';
import { EMPTY_FACTION } from '../../compute/constants';

const FILE_NAME = 'affiliation.ts';

/**
 * Canonical affiliation extraction — the single source of truth for deriving a
 * faction key from a raw affiliation string. It replaces both the old
 * `extractBorderStateAffiliation` (territory / border extraction) and
 * `normalizeFactionKey` (dot / pairing key normalization) with one consistent
 * implementation so that dot keys, territory `ownerFaction`, and border
 * `drawKey` can never diverge across `levels`.
 *
 * Behavior contract (must stay stable for v1 comma data):
 *  - Both `,` and `|` are treated as hierarchy level separators at depth 0
 *    (we ignore `|`/`,` inside `D(...)` parens).
 *  - v3 pipe-delimited data (e.g. `DC|Pesht Military District|Ningxia Prefecture`)
 *    is split into proper levels — `|` is NOT treated as a decoration.
 *  - `levels > 1` appends levels 2..N from the split array (comma OR pipe).
 *  - Returns a canonical key (`MoC`, `FWL,Marik`, `D-LC-DC`, ...).
 *  - Pairing override (`getFactionAffiliationPair`) is keyed `systemId_eraIndex`.
 */

export interface CanonicalAffiliationOptions {
  /** Number of trailing affiliation levels to preserve. Default 1. */
  levels?: number;
  /** How to treat hidden `(H)` systems. Default 'ignore'. */
  parseHiddenSystemsAs?: 'ignore' | 'faction' | 'full';
  /** Remove `,(faction|minor|major) capital` tokens before parsing. Default false. */
  removeCapitalTokens?: boolean;
  /** Affiliations that resolve to the empty key. Default `['', 'A', 'U']`. */
  ignoredAffiliations?: string[];
  /** Passed to the pairing lookup (real systems only). */
  systemId?: string;
  /** Passed to the pairing lookup (real systems only). */
  eraIndex?: number;
  /**
   * Set for synthetic geometry (poisson noise, salient merge points, Sol buffer
   * points) that legitimately has no system identity. Suppresses the
   * `PAIRING_SKIPPED_NO_ID` diagnostic, which is only meaningful for vertices
   * that SHOULD have been paired to a real system.
   */
  syntheticPoint?: boolean;
}

const DEFAULT_IGNORED = ['', 'A', 'U'];
const BORDER_STATE_REGEX = /^([A-Za-z0-9\-]+)\s*(\(([^)]+)\))?/i;
const V3_PIPE_REGEX = /^([A-Za-z]+)\|Region\s+\d+$/i;

/**
 * Capital decoration tokens as they appear in the v3 CSV export.
 *
 * The v3 data is PIPE-delimited (`FWL|Principality of Regulus|District Capital`)
 * and uses six distinct keywords. The previous pattern only matched a COMMA
 * separator and three keywords (`faction|minor|major`), so it stripped nothing
 * from the real export. Because `splitLevels` treats `|` as a hierarchy
 * separator, an unstripped `Capital` became a hierarchy LEVEL of its own, which
 * made capital systems differ from their neighbours at level 3 and produced a
 * spurious one-system border ring around every capital.
 */
const CAPITAL_TOKEN_REGEX =
  /[,|]\s*(faction|national|regional|region|district|minor|major)\s+capital\s*/gi;

export function detectV3Format(affiliation: string): boolean {
  return V3_PIPE_REGEX.test(affiliation.trim());
}

/**
 * Split a raw affiliation into its hierarchy levels using `,` or `|` as a
 * separator, but only at paren-depth 0 (so the disputed form `D(LC|DC)` stays
 * intact as a single level). v3 pipe-delimited tokens (e.g. `DC|Pesht Military District`)
 * are preserved as proper hierarchy levels rather than stripped as decorations.
 */
export function splitLevels(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '(') {
      depth++;
      current += ch;
    } else if (ch === ')') {
      depth = Math.max(0, depth - 1);
      current += ch;
    } else if ((ch === ',' || ch === '|') && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim() || parts.length === 0) {
    parts.push(current.trim());
  }
  return parts.filter((p) => p.length > 0);
}

/**
 * Strip v3 decoration from a single affiliation token.
 * With the pipe-as-level-separator change, tokens from splitLevels no longer
 * carry pipe decorations, so this is effectively a no-op trim.
 */
export function stripV3Decoration(token: string): string {
  return token.trim();
}

/**
 * Apply the faction-pairing override to a computed result. Mirrors the legacy
 * extractor exactly: if a pairing exists with a faction, its normalized
 * affiliation wins; otherwise we fall back to the v3 prefix / first comma part.
 */
export function applyPairing(
  resultSoFar: string,
  explicitlyCleared: boolean,
  ignoredAffiliations: string[],
  systemId?: string,
  eraIndex?: number,
  syntheticPoint = false,
): { result: string; pair: ReturnType<typeof getFactionAffiliationPair> } {
  let finalResult = resultSoFar;
  let pair: ReturnType<typeof getFactionAffiliationPair> = null;
  let fallbackResult: string | null = null;

  // A caller that explicitly cleared the affiliation (currently: hidden `(H)`
  // systems in 'ignore' mode) has made a final decision. The pairing cache
  // stores keys produced by `normalizeFactionKey`, which strips the `(H)`
  // marker, so letting the override run here would resurrect the very systems
  // we just excluded and give them territory / borders of their own.
  if (explicitlyCleared) {
    traceFaction(FILE_NAME, 'PAIRING_SKIPPED_CLEARED', `${systemId}_${eraIndex}`);
    return { result: '', pair: null };
  }

  if (systemId !== undefined && eraIndex !== undefined) {
    pair = getFactionAffiliationPair(systemId, eraIndex);

    if (pair) {
      traceFaction(
        FILE_NAME,
        'PAIRING LOOKUP',
        `${pair.systemName}(${systemId}):${eraIndex}:${pair.normalizedAffiliation}:${pair.faction ? pair.faction.id : 'NULL'}:${pair.resolutionStatus}`,
      );

      if (pair.faction) {
        if (pair.normalizedAffiliation && pair.normalizedAffiliation !== finalResult) {
          // Preserve region hierarchy: only override if the pairing key changes
          // the TOP-LEVEL faction. If finalResult already has the same top-level
          // prefix, the computed region levels from the raw data are kept.
          const topLevel = finalResult.split(',')[0];
          if (pair.normalizedAffiliation !== topLevel) {
            traceFaction(
              FILE_NAME,
              'PAIRING OVERRIDE',
              `${pair.systemName}(${systemId}):${finalResult} -> ${pair.normalizedAffiliation}`,
            );
            finalResult = pair.normalizedAffiliation;
          }
        }
      } else {
        traceFaction(
          FILE_NAME,
          'PAIRING FACTION_NULL',
          `${pair.systemName}(${systemId}):status=${pair.resolutionStatus},raw=${pair.rawAffiliation},normalized=${pair.normalizedAffiliation}`,
        );

        if (!fallbackResult && pair.rawAffiliation) {
          const firstPart = pair.rawAffiliation.split(/[,|]/)[0];
          if (firstPart && firstPart.trim()) {
            fallbackResult = firstPart.trim();
            traceFaction(FILE_NAME, 'COMMA_FALLBACK', `using first part="${fallbackResult}"`);
          }
        }

        // Guard: never override with an affiliation the caller asked to ignore
        if (fallbackResult && ignoredAffiliations.includes(fallbackResult)) {
          traceFaction(
            FILE_NAME,
            'FALLBACK_IGNORED',
            `${pair.systemName}(${systemId}):fallback="${fallbackResult}" is ignored`,
          );
          fallbackResult = null;
        }

        if (fallbackResult && fallbackResult !== finalResult) {
          // Only override at top-level; preserve region hierarchy from raw data.
          const topLevel = finalResult.split(',')[0];
          if (fallbackResult !== topLevel) {
            traceFaction(
              FILE_NAME,
              'FALLBACK_OVERRIDE',
              `${pair.systemName}(${systemId}):${finalResult} -> ${fallbackResult}`,
            );
            finalResult = fallbackResult;
          }
        }
      }
    } else {
      traceFaction(FILE_NAME, 'PAIRING MISSING', `${systemId}_${eraIndex}`);
    }
  } else if (!syntheticPoint) {
    // No systemId/eraIndex supplied. Synthetic geometry (poisson noise, salient
    // merge points, Sol buffer points) copies a neighbouring faction's
    // affiliation by design and is flagged via `syntheticPoint`, so only a REAL
    // system reaching here without its IDs is worth reporting.
    if (finalResult && finalResult !== '' && finalResult !== EMPTY_FACTION) {
      traceFaction(
        FILE_NAME,
        'PAIRING_SKIPPED_NO_ID',
        `no systemId/eraIndex for non-empty affiliation="${finalResult}" (possible missed pairing)`,
      );
    }
  }

  return { result: finalResult, pair };
}

// Coalesce the high-frequency EMPTY_SENTINEL log (see legacy extractor).
let _emptySentinelStreak = 0;

function flushEmptySentinelStreak(): void {
  if (_emptySentinelStreak === 0) return;
  const count = _emptySentinelStreak;
  _emptySentinelStreak = 0;
  traceFaction(
    FILE_NAME,
    'EMPTY_SENTINEL',
    `input is EMPTY_FACTION sentinel (x${count} consecutive)`,
  );
}

function tryExtractFactionFromAnyFormat(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^([A-Za-z0-9\-]+)/);
  if (match) return match[1];
  return null;
}

/**
 * The unified affiliation extractor. See {@link CanonicalAffiliationOptions}.
 */
export function canonicalAffiliation(
  fullAffiliation: string,
  opts: CanonicalAffiliationOptions = {},
): string {
  const {
    levels = 1,
    parseHiddenSystemsAs = 'ignore',
    removeCapitalTokens = false,
    ignoredAffiliations = DEFAULT_IGNORED,
    systemId,
    eraIndex,
    syntheticPoint = false,
  } = opts;

  // The EMPTY_FACTION sentinel marks voronoi/poisson vertices with no real
  // affiliation. Return verbatim and skip all pairing/extraction logic.
  if (fullAffiliation === EMPTY_FACTION) {
    _emptySentinelStreak++;
    return EMPTY_FACTION;
  }

  flushEmptySentinelStreak();

  const trimmedAffiliation = (fullAffiliation || '').trim();

  if (detectV3Format(trimmedAffiliation)) {
    const v3Prefix = trimmedAffiliation.match(V3_PIPE_REGEX)?.[1];
    traceFaction(FILE_NAME, 'V3_FORMAT_DETECTED', `original="${trimmedAffiliation}", prefix="${v3Prefix}"`);
  }

  let working = fullAffiliation;
  if (removeCapitalTokens) {
    working = working.replace(CAPITAL_TOKEN_REGEX, '');
  }

  const match = (working || '').trim().match(BORDER_STATE_REGEX) || [];
  const [, stateAff, , additionalAff] = match;

  if (!stateAff && trimmedAffiliation) {
    traceFaction(
      FILE_NAME,
      'REGEX_NO_MATCH',
      `input="${trimmedAffiliation}", v3_format=${detectV3Format(trimmedAffiliation)}`,
    );
  }

  const result: Array<string> = [];

  // --- Decision Branches (mirrors legacy extractor) ---
  if (stateAff === 'A' && additionalAff && !additionalAff.startsWith('D')) {
    result.push(additionalAff);
  } else if (stateAff === 'U' || (additionalAff === 'H' && parseHiddenSystemsAs === 'ignore')) {
    result.push('');
  } else if (ignoredAffiliations.includes(stateAff)) {
    result.push('');
  } else if (stateAff === 'D') {
    if (additionalAff) {
      // Split the disputed sub-faction list on comma, pipe, OR slash so that
      // the legacy paren forms `D(LC|DC)` and `D(LC/DC)` both normalize to the
      // canonical `D-LC-DC` key (previously done by normalizeFactionKey).
      const combined = [stateAff, ...additionalAff.split(/[,/|]/)].join('-');
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

  // --- Additional Levels ---
  // Split using comma OR pipe (depth-0 only), after stripping v3 decoration.
  if (levels > 1) {
    const parts = splitLevels(working);
    for (let currentLevel = 1; currentLevel < levels; currentLevel++) {
      if (parts.length > currentLevel) {
        const levelValue = stripV3Decoration(parts[currentLevel]);
        if (levelValue) {
          finalResult += ',' + levelValue;
        }
      }
    }
  }

  const { result: paired, pair } = applyPairing(
    finalResult,
    explicitlyCleared,
    ignoredAffiliations,
    systemId,
    eraIndex,
    syntheticPoint,
  );
  finalResult = paired;

  // --- Unified fallback extraction ---
  if (!explicitlyCleared && !finalResult && trimmedAffiliation) {
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

  flushEmptySentinelStreak();

  traceFaction(FILE_NAME, 'FINAL RESULT', `${pair?.systemName || ''}(${systemId}):${finalResult}`);

  return finalResult;
}
