import { canonicalAffiliation } from './affiliation';
import { Era, Faction, System } from '../types';
import { EMPTY_FACTION } from '../../compute/constants';
import { logger } from './logger';

export interface SystemAffiliationRecord {
  raw: string;
  canonical: string;
  resolved: boolean;
  levelKeys: string[];
}

/**
 * Centralized single source of truth for system faction affiliation data.
 *
 * Pre-computes and caches the canonical affiliation for every system at every
 * era for every hierarchy level so that all pipeline stages (poisson-disc
 * filtering, Delaunay vertex construction, border-edge generation, and
 * render) consume the SAME resolved value.
 *
 * Before this manager existed, each stage called `extractBorderStateAffiliation`
 * / `canonicalAffiliation` independently with potentially different options,
 * causing the same system to resolve to different faction keys in different
 * stages. This was the root cause of border bleeding (EF->DC), DC border
 * gaps/loops, and FWL/MoC engulfment anomalies.
 */
export class SystemStateManager {
  /**
   * Map keyed `"systemId_eraIndex"` → resolved record.
   */
  private readonly records = new Map<string, SystemAffiliationRecord>();

  /**
   * Track which system-era pairs were flagged as validation warnings so we
   * only emit each warning once.
   */
  private readonly warned = new Set<string>();

  private constructor() {}

  /**
   * Build the manager from raw system/era data.
   */
  static build(
    systems: System[],
    eras: Era[],
    factionMap: Record<string, Faction>,
    maxLevels: number,
  ): SystemStateManager {
    const manager = new SystemStateManager();

    for (const system of systems) {
      for (const era of eras) {
        const raw = system.eraAffiliations[era.index] || 'U';
        const key = `${system.id}_${era.index}`;

        const levelKeys: string[] = [];
        for (let level = 1; level <= maxLevels; level++) {
          levelKeys.push(
            canonicalAffiliation(raw, {
              levels: level,
              systemId: system.id,
              eraIndex: era.index,
              removeCapitalTokens: true,
            }),
          );
        }

        const canonical = levelKeys[0] || '';
        const resolved = canonical !== '' && canonical !== 'U' && canonical !== 'A';

        manager.records.set(key, { raw, canonical, resolved, levelKeys });
      }
    }

    return manager;
  }

  /**
   * Get the raw affiliation string for a system in a given era.
   */
  getRaw(systemId: string, eraIndex: number): string {
    return this.records.get(`${systemId}_${eraIndex}`)?.raw ?? 'U';
  }

  /**
   * Get the canonical (top-level) affiliation for a system in a given era.
   */
  getAffiliation(systemId: string, eraIndex: number): string {
    return this.records.get(`${systemId}_${eraIndex}`)?.canonical ?? '';
  }

  /**
   * Get the affiliation at a specific hierarchy level.
   */
  getAffiliationAtLevel(systemId: string, eraIndex: number, level: number): string {
    const record = this.records.get(`${systemId}_${eraIndex}`);
    if (!record) return '';
    if (level < 1) return record.canonical;
    const idx = Math.min(level - 1, record.levelKeys.length - 1);
    return record.levelKeys[idx] ?? record.canonical;
  }

  /**
   * Returns true if this system-era pair has a non-ignored, non-empty
   * canonical affiliation (i.e. it contributes borders to the map).
   */
  isActive(systemId: string, eraIndex: number, levels = 1): boolean {
    const aff = this.getAffiliationAtLevel(systemId, eraIndex, levels);
    return aff !== '' && aff !== 'U' && aff !== 'A' && aff !== EMPTY_FACTION;
  }

  /**
   * Returns the full record for inspection / debugging.
   */
  getRecord(systemId: string, eraIndex: number): SystemAffiliationRecord | undefined {
    return this.records.get(`${systemId}_${eraIndex}`);
  }

  /**
   * Returns all records for a given era.
   */
  getRecordsForEra(eraIndex: number): Map<string, SystemAffiliationRecord> {
    const result = new Map<string, SystemAffiliationRecord>();
    const prefix = `_${eraIndex}`;
    for (const [key, record] of this.records) {
      if (key.endsWith(prefix)) {
        result.set(key, record);
      }
    }
    return result;
  }

  /**
   * Validate systems for potential data issues.
   * Logs warnings for suspicious patterns.
   */
  validate(systems: System[], eras: Era[]): void {
    for (const system of systems) {
      for (const era of eras) {
        const key = `${system.id}_${era.index}`;
        const record = this.records.get(key);
        if (!record) continue;

        const warningKey = `validation_${key}`;
        if (this.warned.has(warningKey)) continue;

        // Check: raw is empty or 'U' but canonical resolved to something
        if (
          (record.raw === '' || record.raw === 'U' || record.raw === 'A') &&
          record.canonical !== '' &&
          record.canonical !== 'U' &&
          record.canonical !== 'A'
        ) {
          logger.warn(
            'SystemStateManager',
            `System "${system.name}" (${system.id}) era ${era.index}: raw="${record.raw}" resolves to canonical="${record.canonical}" via pairing override. ` +
            'This system would have been DROPPED from the Delaunay triangulation without the centralized manager (old dual-filter bug).',
          );
          this.warned.add(warningKey);
        }

        // Check: raw is non-ignored but canonical is empty/U
        if (
          record.raw !== '' &&
          record.raw !== 'U' &&
          record.raw !== 'A' &&
          !record.raw.startsWith('(') &&
          (record.canonical === '' || record.canonical === 'U' || record.canonical === 'A')
        ) {
          logger.warn(
            'SystemStateManager',
            `System "${system.name}" (${system.id}) era ${era.index}: raw="${record.raw}" resolves to nothing. Check CSV data.`,
          );
          this.warned.add(warningKey);
        }

        // Check: hierarchy levels produce consistent parent-child relationships
        for (let level = 2; level <= record.levelKeys.length; level++) {
          const parentKey = record.levelKeys[level - 2];
          const childKey = record.levelKeys[level - 1];
          if (childKey && childKey !== parentKey && !childKey.startsWith(parentKey + ',')) {
            logger.warn(
              'SystemStateManager',
              `System "${system.name}" (${system.id}) era ${era.index}: level ${level} key "${childKey}" is not a child of level ${level - 1} key "${parentKey}".`,
            );
            this.warned.add(warningKey);
          }
        }
      }
    }
  }
}
