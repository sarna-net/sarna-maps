import { parseSingleSystem, SystemRow } from './parse-single-system';
import { Era, logger, System } from '../../common';
import { traceFaction } from '../../common/utils/faction-traversal-logger';

/**
 * Capital-level tokens used by v3 `|` delimited affiliation strings.
 *
 * A v3 system affiliation is a *variable-length*, pipe-delimited string. The
 * capital descriptor is always the FINAL token whenever a capital is present,
 * but the total number of tokens is not fixed:
 *
 *   2 tokens:  `AuC|National Capital`              (faction + capital)
 *   3 tokens:  `FWL|Duchy of Tamarind|Region Capital` (faction + district + capital)
 *   4 tokens:  `DC|Pesht Military District|Kagoshima Prefecture|National Capital`
 *   5 tokens:  `FCL|Donegal March|Alarion Operational Area|Region 1|District Capital`
 *
 * When no capital is present the final token is the region instead
 * (e.g. `FS|Crucis March|New Avalon`). Because the number of leading tokens
 * (district / operational area / prefecture) is unbounded, the capital level
 * must be detected by membership in this closed vocabulary, never by a fixed
 * column index.
 *
 * The numeric level mirrors the v1 scale used downstream (1 = highest
 * prominence through 3 = lowest), folding the additional v3 descriptors into
 * the closest existing tier so rendering stays consistent.
 */
const V3_CAPITAL_LEVELS: Record<string, number> = {
  'national capital': 1,
  'faction capital': 1,
  'major capital': 2,
  'minor capital': 3,
  'district capital': 3,
  'region capital': 3,
};

/**
 * Reads a v3 system affiliation string and returns the capital level and
 * region extracted from its `|` delimited tokens.
 *
 * The capital level is taken from the final token only when that token is a
 * known capital descriptor; otherwise the trailing token is treated as the
 * region and the capital level is 0. The region is the token immediately
 * preceding a detected capital descriptor, or the final token when no capital
 * is present.
 *
 * @returns the numeric capital level (0 when none) and the region token, if present.
 */
export function parseV3CapitalAndRegion(affiliation: string): { capitalLevel: number; region: string } {
  if (!affiliation || affiliation.trim() === '') {
    return { capitalLevel: 0, region: '' };
  }

  const parts = affiliation.split('|').map((token) => token.trim()).filter(Boolean);
  if (parts.length <= 1) {
    // The unaffiliated sentinel ("U") and bare single tokens carry no region
    // or capital information.
    return { capitalLevel: 0, region: '' };
  }

  const lastToken = parts[parts.length - 1];
  const capitalLevel = V3_CAPITAL_LEVELS[lastToken.toLowerCase()] ?? 0;

  if (capitalLevel > 0) {
    // Capital descriptor is the trailing token; the region is the token before
    // it (only present when the string has at least three tokens). For a
    // 2-token affiliation like `AuC|National Capital` the first token is the
    // faction, so there is no separate region.
    const region = parts.length >= 3 ? parts[parts.length - 2] : '';
    return { capitalLevel, region };
  }

  // No capital descriptor: the trailing token is the region itself.
  return { capitalLevel: 0, region: lastToken };
}

/**
 * CSV-compatible parser for the v3 spreadsheet export.
 *
 * Expects a matrix (string[][]) where the first row is the header and every
 * subsequent row is a system. Era columns are identified by their year-named
 * headers (e.g. "2271", "3050a"); their order defines the era index.
 */
export function parseSystemsV3Csv(rows: Array<Array<string>>, eras: Array<Era>): Array<System> {
  const HEADER_ROW_INDEX = 0;
  const systems: Array<System> = [];

  logger.info('Reading systems CSV (v3 format) from Export sheet ...');
  traceFaction('src/read/common/parse-systems-v3-csv.ts', 'init', `startParsingSystemsV3CSV totalRows=${rows ? rows.length : 0}`);

  if (!rows || rows.length <= 1) {
    logger.info('Exports sheet CSV empty, no systems read.');
    traceFaction('src/read/common/parse-systems-v3-csv.ts', 'emptySheet', 'noRowsToParse');
    return [];
  }

  const headerRow = rows[HEADER_ROW_INDEX];

  // Map a normalized header name -> column index.
  const columnIndexMap: Record<string, number> = {};
  headerRow.forEach((rawHeader, index) => {
    const key = (rawHeader ?? '').toString().trim().toLowerCase();
    if (key) columnIndexMap[key] = index;
  });

  // Fall back to the canonical v3 column positions when headers are missing.
  const canonical: Record<string, number> = {
    systemid: 0,
    systemname: 1,
    x: 2,
    y: 3,
    size: 4,
    visible: 5,
    height: 6,
    borderid: 7,
    nation: 8,
    district: 9,
    region: 10,
    zone: 11,
    capital: 11,
    attribute: 12,
    factioncolor: 13,
  };
  for (const [name, index] of Object.entries(canonical)) {
    if (columnIndexMap[name] === undefined && index < headerRow.length) {
      columnIndexMap[name] = index;
    }
  }

  // Common aliases used by parseSingleSystem / downstream consumers.
  if (columnIndexMap['systemid'] !== undefined) columnIndexMap['id'] = columnIndexMap['systemid'];
  if (columnIndexMap['systemname'] !== undefined) columnIndexMap['name'] = columnIndexMap['systemname'];

  // Era columns: any header matching a 4-digit year (optionally suffixed by a
  // letter, e.g. "3050a") is an era column, in header order.
  const eraColumnIndices: number[] = [];
  headerRow.forEach((rawHeader, index) => {
    const key = (rawHeader ?? '').toString().trim().toLowerCase();
    if (/^\d{4}([a-z])?$/.test(key)) {
      eraColumnIndices.push(index);
    }
  });

  if (columnIndexMap['x'] === undefined || columnIndexMap['y'] === undefined) {
    logger.warn('parse-systems-v3-csv.ts', 'Missing x or y columns in exports CSV, cannot parse systems');
    traceFaction('src/read/common/parse-systems-v3-csv.ts', 'missingCoordinates', `x=${columnIndexMap['x']}, y=${columnIndexMap['y']}`);
    return [];
  }

  traceFaction(
    'src/read/common/parse-systems-v3-csv.ts',
    'columnMappingComplete',
    `x=${columnIndexMap['x']}, y=${columnIndexMap['y']}, id=${columnIndexMap['id']}, name=${columnIndexMap['name']}, eras=${eraColumnIndices.length}`,
  );

  for (let rowIndex = HEADER_ROW_INDEX + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    if (!row || row.length === 0 || row.every((cell) => (cell ?? '').trim() === '')) {
      traceFaction('src/read/common/parse-systems-v3-csv.ts', 'skipEmptyRow', `rowIndex=${rowIndex}`);
      continue;
    }

    const get = (name: string): string => {
      const idx = columnIndexMap[name];
      return idx !== undefined && idx < row.length ? (row[idx] ?? '') : '';
    };

    const xRaw = get('x');
    const yRaw = get('y');
    if (isNaN(parseFloat(xRaw)) || isNaN(parseFloat(yRaw))) {
      traceFaction(
        'src/read/common/parse-systems-v3-csv.ts',
        'skipNoCoordinates',
        `rowIndex=${rowIndex}, x=${xRaw}, y=${yRaw}, id=${get('id')}, name=${get('name')}`,
      );
      continue;
    }

    const rawSize = get('size');
    const sizeParts = (rawSize || '')
      .split(/[,|]/)
      .map((element) => parseFloat(element))
      .filter((n) => !isNaN(n));

    const eraAffiliations = eras.map((_, eraIndex) => {
      const colIndex = eraColumnIndices[eraIndex];
      const raw =
        colIndex !== undefined && colIndex < row.length ? row[colIndex] : undefined;
      return raw !== undefined && raw !== null && raw.trim() !== '' ? String(raw).trim() : 'U';
    });

    const rowToParse: SystemRow = {
      id: get('id'),
      name: get('name'),
      alternateNames: '',
      x: parseFloat(xRaw),
      y: parseFloat(yRaw),
      size: (sizeParts.length >= 2 ? [sizeParts[0], sizeParts[1], sizeParts[2] ?? 0] : [1, 1, 0]) as [number, number, number],
      eraAffiliations,
    };

    traceFaction(
      'src/read/common/parse-systems-v3-csv.ts',
      'parseRowInput',
      `rowIndex=${rowIndex}, id=${rowToParse.id}, name=${rowToParse.name}, x=${rowToParse.x}, y=${rowToParse.y}`,
    );

    systems.push(parseSingleSystem('system-export-csv-' + rowIndex, rowToParse, eras));

    traceFaction('src/read/common/parse-systems-v3-csv.ts', 'parseRowOutput', `rowIndex=${rowIndex}, systemParsed success`);
  }

  systems.sort((a, b) => b.radiusX + b.radiusY - (a.radiusX + a.radiusY));

  const systemsWithIds = systems.map((s) => s.id).filter((id) => id && id.trim() !== '');
  traceFaction(
    'src/read/common/parse-systems-v3-csv.ts',
    'functionComplete',
    `totalSystems=${systems.length}, systemsWithIds=${systemsWithIds.length}, eraCount=${eras.length}`,
  );

  logger.info(`${systems.length} systems read (v3 CSV exports format).`);
  return systems;
}
