import { expect, describe, it } from 'vitest';
import { parseEras } from './parse-eras';
import { parseDescriptionCsvEraNames } from '../csv-reader';

describe('parseDescriptionCsvEraNames (from Universal - Systems Sheet Description.csv)', () => {

  it('should extract era names from description CSV rows matching year pattern in column B', () => {
    // Simulates the description CSV structure:
    // - Rows 0-8: column metadata (skipped)
    // - Row 10+ (index 9): era data
    //   Early rows have year in col D (embedded in source citation) — not picked up
    //   Later rows have year in col B (index 1), name in col C (index 2)
    const rows: Array<Array<string>> = [
      // Header + metadata rows (0-8, skipped)
      ['Column', 'Title', 'Description'],
      ['', '#REF!', 'unique system ID'],
      ['', '', 'Name of the System'],
      ['', '', 'Alternate names'],
      ['', '', 'X-ordinate'],
      ['', '', 'Y-ordinate'],
      ['', '', 'reference size'],
      ['', '', 'URL'],
      ['', '', 'distance'],
      // Row 10 (index 9) - first era row: no year in col B (book year, skipped by this parser)
      ['', '', 'Free Worlds League Founding', '[35019] Handbook: House Marik'],
      // Later era rows with year in col B
      ['', '3031', 'Operation Dragonfall - End of Combat Operations'],
      ['', '3040', 'End of War of 3039', '[35014] Historical: War of 3039'],
      ['', '3049', 'Operation Revival: Periphery Action'],
      ['', '3050a', 'Operation Revival: Wave 1'],
      ['', '3050b', 'Operation Revival: Wave 2'],
      ['', '3152', 'IlClan Era', '[35902] Tamar Rising'],
    ];

    const eraNameMap = parseDescriptionCsvEraNames(rows);

    // The early book-year rows (no year in col B) should be skipped
    // Only the rows with a 4-digit year in column B are included
    expect(eraNameMap.size).to.equal(6);

    expect(eraNameMap.get('3031')).to.equal('Operation Dragonfall - End of Combat Operations');
    expect(eraNameMap.get('3040')).to.equal('End of War of 3039');
    expect(eraNameMap.get('3049')).to.equal('Operation Revival: Periphery Action');
    expect(eraNameMap.get('3050a')).to.equal('Operation Revival: Wave 1');
    expect(eraNameMap.get('3050b')).to.equal('Operation Revival: Wave 2');
    expect(eraNameMap.get('3152')).to.equal('IlClan Era');
  });

  it('should return empty map for rows with insufficient data', () => {
    const rows: Array<Array<string>> = [
      ['', '', ''],
      ['', '', ''],
    ];

    const eraNameMap = parseDescriptionCsvEraNames(rows);
    expect(eraNameMap.size).to.equal(0);
  });

  it('should return empty map for empty input', () => {
    const eraNameMap = parseDescriptionCsvEraNames([]);
    expect(eraNameMap.size).to.equal(0);
  });
});

describe('parseEras (Google Sheets / XLSX description sheet format)', () => {

  it('should handle non-string cells (null/number) from GSheet/XLSX sources', () => {
    // Column layout for XLSX/GSheet: [empty col0, year in col1, name in col2]
    const rows: Array<Array<unknown>> = [
      [null, null, null],
      [undefined, undefined, undefined],
      ['', '', ''],
      [null, null, null],
      [undefined, undefined, undefined],
      ['', '', ''],
      [null, null, null],
      [undefined, undefined, undefined],
      ['', '', ''],
      // Row 10 (index 9): col1 = year, col2 = name
      [null, 35019, 'Free Worlds League Founding'],
      [12345, 35024, 'Federated Suns Founding'],
      ['', 35014, 'End of War of 3039'],
    ];

    const eras = parseEras(rows);

    // The 3 rows with valid year + name should be parsed
    expect(eras).to.have.lengthOf(3);
    expect(eras[0].name).to.equal('Free Worlds League Founding');
    expect(eras[0].year).to.equal(35019);
    expect(eras[1].name).to.equal('Federated Suns Founding');
    expect(eras[1].year).to.equal(35024);
    expect(eras[2].name).to.equal('End of War of 3039');
    expect(eras[2].year).to.equal(35014);
  });
});
