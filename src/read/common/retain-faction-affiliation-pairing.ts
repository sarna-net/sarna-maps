import { Faction, System, Era, logger } from '../../common';
import { traceFaction } from '../../common/utils/faction-traversal-logger';
import { normalizeFactionKey } from '../../common/utils/normalize-faction-key';

export interface FactionAffiliationPair {
  systemId: string;
  systemName: string;
  eraIndex: number;
  eraYear: number;
  rawAffiliation: string;
  normalizedAffiliation: string;
  faction: Faction | null;
  resolutionStatus:
    | 'success'
    | 'missing-affiliation'
    | 'no-faction-match'
    | 'no-era-match'
    | 'multiple-matches';
}

const pairingCache: Map<string, FactionAffiliationPair> = new Map();

/**
 * Normalize affiliation keys using the shared normalizeFactionKey utility.
 * Handles disputed parenthesized keys (e.g. D(LC|DC) -> D-LC-DC),
 * v3 pipe-delimited data, region prefixes, and all v1/v2 formats.
 */
function normalizeAffiliationKey(raw: string, fileName: string, stage: string): string {
  if (!raw) {
    traceFaction(fileName, `${stage}:normalize:empty`, 'EMPTY');
    return '';
  }

  const normalized = normalizeFactionKey(raw);
  traceFaction(fileName, `${stage}:normalize:changed`, `${raw} -> ${normalized}`);
  return normalized;
}

/**
 * Build lookup: factionId → factions[]
 * Uses case-insensitive key matching to handle variations like "Ciz" vs "CIZ"
 */
function buildFactionLookup(factions: Faction[]): Map<string, Faction[]> {
  const map = new Map<string, Faction[]>();

  for (const faction of factions) {
    const normalizedKey = faction.id.toUpperCase();
    if (!map.has(normalizedKey)) {
      map.set(normalizedKey, []);
    }

    map.get(normalizedKey)!.push(faction);
  }

  return map;
}

/**
 * Resolve faction with full diagnostic states
 */
function resolveFactionForEra(
  affiliationKey: string,
  era: Era,
  factionLookup: Map<string, Faction[]>,
  fileName: string,
  stage: string
): { faction: Faction | null; status: FactionAffiliationPair['resolutionStatus'] } {

  if (!affiliationKey) {
    traceFaction(fileName, `${stage}:resolve:missing-affiliation`, 'EMPTY');
    return { faction: null, status: 'missing-affiliation' };
  }

  let lookupKey = affiliationKey.toUpperCase();

  // Handle disputed faction keys (e.g. D-FS-MC from D(FS/MC)).
  // The D- prefix is a "disputed" marker, not part of the faction ID.
  // Strip it and look up each sub-faction individually.
  if (lookupKey.startsWith('D-')) {
    const subKeyParts = lookupKey.slice(2).split('-');
    const subCandidates: Faction[] = [];
    for (const part of subKeyParts) {
      const subLookupKey = part.toUpperCase();
      const subCand = factionLookup.get(subLookupKey);
      if (subCand) {
        subCandidates.push(...subCand);
      }
    }
    if (subCandidates.length > 0) {
      traceFaction(
        fileName,
        `${stage}:resolve:disputed-sub-factions`,
        `${subCandidates.map((f) => f.id).join(', ')}`
      );
      const valid = subCandidates.filter(f => {
        const foundingOk = f.founding === undefined || f.founding <= era.year;
        const dissolutionOk = f.dissolution === null || f.dissolution === undefined || f.dissolution >= era.year;
        return foundingOk && dissolutionOk;
      });
      traceFaction(fileName, `${stage}:resolve:valid-count`, `${valid.length}`);

      if (valid.length === 0) {
        traceFaction(fileName, `${stage}:resolve:no-era-match`, lookupKey);
        return { faction: null, status: 'no-era-match' };
      }

      if (valid.length > 1) {
        traceFaction(fileName, `${stage}:resolve:multiple-matches`, lookupKey);
        return { faction: valid[0], status: 'multiple-matches' };
      }

      traceFaction(fileName, `${stage}:resolve:success`, lookupKey);
      return { faction: valid[0], status: 'success' };
    }
  }

  const candidates = factionLookup.get(lookupKey);

  if (!candidates || candidates.length === 0) {
    traceFaction(fileName, `${stage}:resolve:no-faction-match`, lookupKey);
    return { faction: null, status: 'no-faction-match' };
  }

  traceFaction(fileName, `${stage}:resolve:candidates-count`, `${candidates.length}`);

  const valid = candidates.filter(f => {
    const foundingOk = f.founding === undefined || f.founding <= era.year;
    const dissolutionOk = f.dissolution === null || f.dissolution === undefined || f.dissolution >= era.year;
    traceFaction(fileName, `${stage}:resolve:faction-valid`, `${f.id}:founding=${f.founding}:dissolution=${f.dissolution}:era=${era.year}:valid=${foundingOk && dissolutionOk}`);
    return foundingOk && dissolutionOk;
  });

  traceFaction(fileName, `${stage}:resolve:valid-count`, `${valid.length}`);

  if (valid.length === 0) {
    traceFaction(fileName, `${stage}:resolve:no-era-match`, lookupKey);
    return { faction: null, status: 'no-era-match' };
  }

  if (valid.length > 1) {
    traceFaction(fileName, `${stage}:resolve:multiple-matches`, lookupKey);
    return { faction: valid[0], status: 'multiple-matches' };
  }

  traceFaction(fileName, `${stage}:resolve:success`, lookupKey);
  return { faction: valid[0], status: 'success' };
}

/**
 * Build all pairings once
 */
export function buildFactionAffiliationPairs(
  systems: System[],
  factions: Faction[],
  eras: Era[]
): Map<string, FactionAffiliationPair> {

  pairingCache.clear();

  const fileName = 'retain-faction-affiliation-pairing.ts';
  const stage = 'build';

  const factionLookup = buildFactionLookup(factions);

  traceFaction(fileName, `${stage}:init`, `systems=${systems.length}, factions=${factions.length}, uniqueKeys=${factionLookup.size}`);

  const duplicateIds = factions.reduce((acc, f) => {
    const upper = f.id.toUpperCase();
    acc[upper] = (acc[upper] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const duplicates = Object.entries(duplicateIds).filter(([, count]) => count > 1);
  if (duplicates.length > 0) {
    logger.warn('retain-faction-affiliation-pairing.ts', `Duplicate faction IDs detected (case-insensitive): ${duplicates.map(([id]) => id).join(', ')}`);
  }

  for (const system of systems) {
    for (const era of eras) {

        const rawAffiliation = system.eraAffiliations?.[era.index] || '';


      traceFaction(
        fileName,
        `${stage}:input`,
        `${system.name}(${system.id}):${era.year}:${rawAffiliation}`
      );

      const normalized = normalizeAffiliationKey(rawAffiliation, fileName, stage);

      const { faction, status } = resolveFactionForEra(
        normalized,
        era,
        factionLookup,
        fileName,
        stage
      );

        const cacheKey = `${system.id}_${era.index}`;


      const pair: FactionAffiliationPair = {
        systemId: system.id,
        systemName: system.name,
        eraIndex: era.index,
        eraYear: era.year,
        rawAffiliation,
        normalizedAffiliation: normalized,
        faction,
        resolutionStatus: status
      };

      pairingCache.set(cacheKey, pair);

      traceFaction(
        fileName,
        `${stage}:output`,
        `${system.name}(${cacheKey}):${normalized}:${faction ? faction.id : 'NULL'}:${status}`
      );
    }
  }

  const statusToKey: Record<FactionAffiliationPair['resolutionStatus'], keyof typeof stats> = {
    'success': 'success',
    'missing-affiliation': 'missingAffiliation',
    'no-faction-match': 'noFactionMatch',
    'no-era-match': 'noEraMatch',
    'multiple-matches': 'multipleMatches'
  };
  const stats = {
    total: systems.length * eras.length,
    success: 0,
    missingAffiliation: 0,
    noFactionMatch: 0,
    noEraMatch: 0,
    multipleMatches: 0
  };
  for (const pair of pairingCache.values()) {
    stats[statusToKey[pair.resolutionStatus]]++;
  }
  logger.info('retain-faction-affiliation-pairing.ts', `Pairing build complete: ${JSON.stringify(stats)}`);
  traceFaction(fileName, `${stage}:summary`, JSON.stringify(stats));

  return pairingCache;
}

/**
 * Render-safe accessor (never throws)
 */
export function getFactionAffiliationPair(
  systemId: string,
  eraIndex: number
): FactionAffiliationPair | null {

    const key = `${systemId}_${eraIndex}`;
  return pairingCache.get(key) || null;
}