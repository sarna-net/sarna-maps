import fs from 'fs';
import path from 'path';
import { logger, Era } from '../common';
import { parseFactions, parseSystems, parseSystemsV3Csv, SheetData } from './common';
import { DataSourceConfig } from '../common';
import { traceFaction } from '../common/utils/faction-traversal-logger';
import { CsvParser, CsvError, CsvErrorCodes } from './common/csv-parser';

export interface CsvRecord {
  [key: string]: string;
}

const PARSER_CONFIG = {
  delimiter: ',',
  quote: '"',
  escape: '\\',
  skipEmptyLines: true,
};

export function convertToMatrixFormat(records: CsvRecord[]): string[][] {
  if (!records || records.length === 0) return [];

  const headers = Object.keys(records[0]);
  const matrix: string[][] = [headers];

  for (const record of records) {
    const row: string[] = [];
    for (const header of headers) {
      row.push(record[header] || '');
    }
    matrix.push(row);
  }

  return matrix;
}

/**
 * Parse the Universal - Systems Sheet Description CSV to build an era name lookup.
 * Reads rows from index 9 onward (after column metadata). For each row where
 * column B (index 1) contains a 4-digit year (optionally with a variant letter),
 * maps that year string to the era name in column C (index 2).
 *
 * @param descriptionRows The description CSV content as a string matrix.
 * @returns A Map of year string (e.g. "3031", "3050a") to era name.
 */
export function parseDescriptionCsvEraNames(descriptionRows: string[][]): Map<string, string> {
  const eraNameMap = new Map<string, string>();

  if (!descriptionRows || descriptionRows.length < 10) return eraNameMap;

  const ERA_YEAR_PATTERN = /^\d{4}([a-z])?$/;

  for (let i = 9; i < descriptionRows.length; i++) {
    const row = descriptionRows[i];
    if (!row || row.length < 3) continue;

    const yearStr = (row[1] || '').trim();
    const name = (row[2] || '').trim();

    if (ERA_YEAR_PATTERN.test(yearStr) && name) {
      eraNameMap.set(yearStr, name);
    }
  }

  return eraNameMap;
}

export async function readFromCsvFiles(
  systemsPath: string,
  factionsPath?: string,
  descriptionPath?: string,
  dataSourceConfig?: DataSourceConfig,
  activeEras?: Set<number>,
): Promise<SheetData> {
  try {
    logger.info(`csv-reader.ts: Reading systems CSV file from: ${systemsPath}`);

    const parser = new CsvParser(PARSER_CONFIG);
    const systemsContent = fs.readFileSync(systemsPath, 'utf8');
    const systemsMatrix = parser.parseMatrix(systemsContent) as string[][];
    const systemsRecords = parser.parse(systemsContent) as CsvRecord[];

    let factionsRecords: CsvRecord[] = [];

    if (factionsPath) {
      logger.info(`csv-reader.ts: Reading factions CSV file from: ${factionsPath}`);
      factionsRecords = parser.parse(fs.readFileSync(factionsPath, 'utf8')) as CsvRecord[];
    } else {
      const discovered = discoverFactionsFile(systemsPath);
      if (discovered) {
        logger.info(`csv-reader.ts: Reading factions CSV file from: ${discovered}`);
        factionsRecords = parser.parse(fs.readFileSync(discovered, 'utf8')) as CsvRecord[];
      }
    }

    const { isV3, formatVersion } = detectV3Format(systemsRecords);
    traceFaction('src/read/csv-reader.ts', 'csv-version', isV3 ? 'v3-detected' : 'v1-detected');
    logger.info(`csv-reader.ts: Detected ${formatVersion} format`);

    // Read era names from the description CSV
    let descriptionEraNames: Map<string, string> = new Map();
    if (descriptionPath) {
      try {
        logger.info(`csv-reader.ts: Reading description CSV file from: ${descriptionPath}`);
        const descriptionContent = fs.readFileSync(descriptionPath, 'utf8');
        const descriptionMatrix = parser.parseMatrix(descriptionContent) as string[][];
        descriptionEraNames = parseDescriptionCsvEraNames(descriptionMatrix);
        logger.info(`csv-reader.ts: Loaded ${descriptionEraNames.size} era names from description CSV`);
      } catch (err) {
        logger.warn(`csv-reader.ts: Could not read description CSV, eras will use year-based names: ${err}`);
      }
    } else {
      // Auto-discover description CSV
      const discovered = discoverDescriptionFile(systemsPath);
      if (discovered) {
        logger.info(`csv-reader.ts: Reading description CSV file from: ${discovered}`);
        const descriptionContent = fs.readFileSync(discovered, 'utf8');
        const descriptionMatrix = parser.parseMatrix(descriptionContent) as string[][];
        descriptionEraNames = parseDescriptionCsvEraNames(descriptionMatrix);
        logger.info(`csv-reader.ts: Loaded ${descriptionEraNames.size} era names from description CSV`);
      }
    }

    const eras = isV3
      ? extractV3Eras(systemsMatrix[0], descriptionEraNames)
      : systemsRecords.length > 0 &&
          systemsRecords[0].hasOwnProperty('year') &&
          systemsRecords[0].hasOwnProperty('name')
        ? parseErasLegacy(systemsMatrix)
        : [];

    const factionsSheet = convertToMatrixFormat(factionsRecords);

    const factionColumnIndex = 0;
    for (const row of factionsSheet.slice(0, 1)) {
      traceFaction('src/read/csv-reader.ts', 'read-csv', row[factionColumnIndex]);
    }

    const factions = parseFactions(factionsSheet);

    const systems = isV3
      ? parseSystemsV3Csv(systemsMatrix, eras)
      : parseSystems(
          convertToMatrixFormat(
            systemsRecords.filter(
              (row) => row.hasOwnProperty('systemname') && row.hasOwnProperty('x') && row.hasOwnProperty('y'),
            ),
          ) as unknown as Array<Array<string>>,
          eras,
        );

    return { eras, factions, systems };
  } catch (error) {
    if (error instanceof CsvError) {
      logger.error('csv-reader.ts', `CSV Error: ${error.message}`, error);
      throw error;
    }
    logger.error(
      'csv-reader.ts',
      `Error reading CSV files: ${error instanceof Error ? error.message : String(error)}`,
      error,
    );
    throw new CsvError(
      CsvErrorCodes.PARSE_ERROR,
      `Failed to read CSV files: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined,
      systemsPath,
    );
  }
}

export function detectV3Format(data: CsvRecord[]): {
  isV3: boolean;
  formatVersion: 'v1' | 'v3';
} {
  if (!data || data.length === 0) return { isV3: false, formatVersion: 'v1' };

  const firstRow = data[0];
  const firstRowKeys = Object.keys(firstRow).map((key) => key.toLowerCase());
  const hasSystemId = firstRowKeys.includes('systemid');

  // v3 CSV exports name era columns by year (e.g. "2271", "3050a") and carry a
  // dedicated faction color only in the factions file; the systems export may
  // omit it, so we key detection on systemid + the year-named era columns.
  // Keys are matched case-insensitively so a header like `systemID` (the exact
  // spec casing) is detected correctly even when the records are not lowercased.
  const eraYearColumns = firstRowKeys.filter((key) => /^\d{4}([a-z])?$/.test(key));
  const hasMultipleEraColumns = eraYearColumns.length >= 2;

  if (hasSystemId && hasMultipleEraColumns) {
    logger.info('csv-reader.ts: Found v3 CSV format with systemId and multiple era columns');
    return { isV3: true, formatVersion: 'v3' };
  }

  return { isV3: false, formatVersion: 'v1' };
}

/**
 * Builds the era list for a v3 CSV export from its year-named header columns
 * (e.g. "2271", "2317", ...), enriched with descriptive names from the
 * description CSV if available.
 *
 * @param headerRow The systems CSV header row (first row of the matrix).
 * @param descriptionEraNames A map of year string to descriptive era name (may be empty).
 * @returns The array of Era objects with indices aligned to column positions.
 */
export function extractV3Eras(headerRow: string[], descriptionEraNames?: Map<string, string>): Era[] {
  if (!headerRow || headerRow.length === 0) return [];

  const FIRST_ERA_COLUMN_INDEX = 5;
  const eras: Era[] = [];

  for (let i = FIRST_ERA_COLUMN_INDEX; i < headerRow.length; i++) {
    const key = (headerRow[i] ?? '').toString().trim();
    const match = key.match(/^(\d{4})([a-z])?$/);
    if (!match) continue;
    const year = parseInt(match[1], 10);
    if (isNaN(year)) continue;

    // Use descriptive name from description CSV if available
    const descriptiveName = descriptionEraNames?.get(key);
    eras.push({
      index: i - FIRST_ERA_COLUMN_INDEX,
      name: descriptiveName || key,
      year,
    });
  }

  return eras;
}

/**
 * Legacy era parser for v1 CSV format (read from description sheet data).
 * Starts reading from row 10 (index 9), year in column B (index 1),
 * name in column C (index 2).
 */
function parseErasLegacy(rows: string[][]): Era[] {
  const eras: Era[] = [];

  for (let i = 9; i < (rows || []).length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    const yearStr = (row[1] || '').trim();
    const name = (row[2] || '').trim();

    if (!yearStr || !name || isNaN(parseInt(yearStr, 10))) continue;

    eras.push({
      index: eras.length,
      name,
      year: parseInt(yearStr, 10),
    });
  }

  return eras;
}

function discoverFactionsFile(systemsPath: string): string | null {
  const baseDir = path.dirname(systemsPath);
  const baseName = path.basename(systemsPath);

  const patterns = [
    baseName.replace('Systems', 'Factions'),
    baseName.replace('- Systems', '- Factions'),
    baseName.replace(' Systems', ' Factions'),
    baseName.replace('systems', 'factions'),
    'Factions.csv',
    'Factions Export.csv',
    baseName.split('.')[0] + ' Factions.csv',
  ];

  for (const pattern of patterns) {
    const factionsPath = path.join(baseDir, pattern);
    try {
      if (fs.existsSync(factionsPath)) {
        logger.info(`csv-reader.ts: Found factions file: ${pattern}`);
        return factionsPath;
      }
    } catch {
      continue;
    }
  }

  logger.warn(`csv-reader.ts: No factions file found for systems file: ${baseName}`);
  return null;
}

function discoverDescriptionFile(systemsPath: string): string | null {
  const baseDir = path.dirname(systemsPath);

  const patterns = [
    'Universal - Systems Sheet Description.csv',
    'Systems Sheet Description.csv',
    '*Description*.csv',
  ];

  for (const pattern of patterns) {
    const descriptionPath = path.join(baseDir, pattern);
    try {
      if (fs.existsSync(descriptionPath)) {
        logger.info(`csv-reader.ts: Found description file: ${pattern}`);
        return descriptionPath;
      }
    } catch {
      continue;
    }
  }

  // Try glob-like: list files and look for description
  try {
    const files = fs.readdirSync(baseDir);
    const match = files.find((f) => f.toLowerCase().includes('description'));
    if (match) {
      const descriptionPath = path.join(baseDir, match);
      logger.info(`csv-reader.ts: Found description file: ${match}`);
      return descriptionPath;
    }
  } catch {
    // ignore
  }

  logger.warn(`csv-reader.ts: No description file found in: ${baseDir}`);
  return null;
}
