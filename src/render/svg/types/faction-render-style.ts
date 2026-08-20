import { Faction } from '../../../common';
import { FactionAffiliationPair } from '../../../read/common/retain-faction-affiliation-pairing';
import { getFactionAffiliationPair } from '../../../read/common/retain-faction-affiliation-pairing';

export interface FactionRenderStyle {
  faction: Faction | null;
  color: string;
  isDisputed: boolean;
  disputedFactionIds: string[];
  isCapital: boolean;
  capitalLevel: number;
  resolutionStatus: FactionAffiliationPair['resolutionStatus'] | 'unknown';
  factionKey: string;
}

export function resolveFactionRenderStyle(options: {
  systemId?: string;
  eraIndex?: number;
  factionKey?: string;
  factionMap: Record<string, Faction>;
  pairs?: Map<string, FactionAffiliationPair>;
}): FactionRenderStyle {
  const { systemId, eraIndex, factionKey: rawKey, factionMap, pairs } = options;

  if (systemId !== undefined && eraIndex !== undefined) {
    const pair = pairs?.get(`${systemId}_${eraIndex}`) || getFactionAffiliationPair(systemId, eraIndex);
    if (pair) {
      const disputed = pair.normalizedAffiliation.startsWith('D-') || pair.normalizedAffiliation === 'D';
      const disputedFactionIds = disputed
        ? pair.normalizedAffiliation.replace(/^D-?/, '').split('-').filter(Boolean)
        : [];
      return {
        faction: pair.faction,
        color: pair.faction?.color || '#999999',
        isDisputed: disputed,
        disputedFactionIds,
        isCapital: false,
        capitalLevel: 0,
        resolutionStatus: pair.resolutionStatus,
        factionKey: pair.normalizedAffiliation,
      };
    }
  }

  const key = rawKey || '';
  const upperKey = key.toUpperCase();
  // Disputed includes D- prefix and parenthesized forms D(F1|F2), D(F1/F2) etc.
  const isDisputed = key.startsWith('D-') || key === 'D' || /^D\(/i.test(key);
  let disputedFactionIds: string[] = [];
  if (isDisputed) {
    if (key.startsWith('D(')) {
      const inner = key.slice(2, -1); // strip D( ... )
      disputedFactionIds = inner.split(/[-|/,]/).map(s=>s.trim()).filter(Boolean);
    } else {
      disputedFactionIds = key.replace(/^D-?/, '').split('-').filter(Boolean);
    }
  }

  // Case-insensitive lookup: map may be keyed raw (AuC) or upper (AUC).
  // Helper scans both direct keys and values' ids to handle any caller-built map.
  // Also handles abandoned-world wrapper A(FACTION) -> inner faction.
  function findFactionInsensitive(map: Record<string, Faction>, k: string): Faction | null {
    if (!k) return null;
    // Unwrap abandoned-world keys A(CFG) -> CFG for lookup
    const abandonedMatch = k.match(/^A\(([^)]+)\)$/i);
    const lookupKey = abandonedMatch ? abandonedMatch[1] : k;
    if (map[lookupKey]) return map[lookupKey];
    const uk = lookupKey.toUpperCase();
    if (map[uk]) return map[uk];
    for (const f of Object.values(map)) {
      if (f.id.toUpperCase() === uk) return f;
    }
    return null;
  }
  // For disputed keys, faction is null (multiple owners); for abandoned, lookup inner
  const faction = isDisputed ? null : findFactionInsensitive(factionMap, key);

  return {
    faction,
    color: faction?.color || '#999999',
    isDisputed,
    disputedFactionIds,
    isCapital: false,
    capitalLevel: 0,
    resolutionStatus: 'unknown',
    factionKey: key,
  };
}
