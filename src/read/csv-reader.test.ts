import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import { readFromCsvFiles, detectV3Format, extractV3Eras, CsvRecord } from './csv-reader';

const DATA_DIR = path.resolve(process.cwd(), 'data/Custom');

describe('csv-reader unit (fixtures)', () => {
  const systemsPath = path.join(DATA_DIR, '_fixture-systems.csv');

  it('reads v3 systems and eras from a fixture with year-named columns', async () => {
    const data = await readFromCsvFiles(systemsPath);

    expect(data.systems).toHaveLength(3);
    expect(data.eras).toHaveLength(4); // 2271, 2317, 3050a, 3050b
    expect(data.eras.map((e) => e.year)).toEqual([2271, 2317, 3050, 3050]);

    const avalon = data.systems.find((s) => s.name === 'New Avalon');
    expect(avalon).toBeDefined();
    expect(avalon?.eraAffiliations).toEqual(['U', 'FS', 'DC', 'LC']);
  });

  it('detects v3 when systemid and year-named era columns are present', () => {
    const rows: CsvRecord[] = [
      { systemid: '1', systemname: 'A', x: '0', y: '0', '2271': 'LC', '2317': 'FS', '3050a': 'DC' },
    ];
    expect(detectV3Format(rows)).toEqual({ isV3: true, formatVersion: 'v3' });
  });

  it('detects v3 with the exact-spec mixed-case header (systemID)', () => {
    const rows: CsvRecord[] = [
      { systemID: '1', systemName: 'A', x: '0', y: '0', '2271': 'LC', '2317': 'FS', '3050a': 'DC' },
    ];
    expect(detectV3Format(rows)).toEqual({ isV3: true, formatVersion: 'v3' });
  });

  it('builds eras from year-named columns for v3', () => {
    const header = ['systemid', 'systemname', 'x', 'y', 'size', '2271', '2317', '3050a'];
    expect(extractV3Eras(header)).toEqual([
      { index: 0, name: '2271', year: 2271 },
      { index: 1, name: '2317', year: 2317 },
      { index: 2, name: '3050a', year: 3050 },
    ]);
  });

  it('does not flag v3 for a v1-style sheet (era_0/era_1 naming, no systemid)', () => {
    const rows: CsvRecord[] = [
      { id: 'id', systemname: 'name', x: '1', y: '2' },
      { id: '1', era_0: 'LC', era_1: 'FS' },
    ];
    expect(detectV3Format(rows).isV3).toBe(false);
  });
});

describe('csv-reader integration (real TrollMaster v3.5 export)', () => {
  const systemsPath = path.join(
    DATA_DIR,
    'TrollMaster v3.5 - Sarna Unified Cartography Kit (Official) - Systems CSV Export.csv',
  );
  const factionsPath = path.join(
    DATA_DIR,
    'TrollMaster v3.5 - Sarna Unified Cartography Kit (Official) - Factions CSV Export.csv',
  );

  it('reads systems and factions from the large export without throwing', async () => {
    expect(fs.existsSync(systemsPath)).toBe(true);
    const data = await readFromCsvFiles(systemsPath, factionsPath);

    expect(data.systems.length).toBeGreaterThan(0);
    expect(data.factions.length).toBeGreaterThan(0);
    expect(data.eras.length).toBeGreaterThan(0);

    const withAffiliations = data.systems.filter((s) =>
      s.eraAffiliations.some((a) => a && a !== 'U'),
    );
    expect(withAffiliations.length).toBeGreaterThan(0);
  }, 120000);
});
