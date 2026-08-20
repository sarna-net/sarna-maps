import { Faction, logger } from '../../common';
import { traceFaction } from '../../common/utils/faction-traversal-logger';

function findHeaderRow(rows: Array<Array<string>>): number {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 5); rowIndex++) {
    const row = rows[rowIndex];
    if (!row) continue;
    const rowStr = row.map(cell => (cell ?? '').toString().toLowerCase()).join(',');
    if (rowStr.includes('factionid')) {
      traceFaction('src/read/common/parse-factions.ts', 'header-row-found', `row=${rowIndex}`);
      return rowIndex;
    }
  }
  traceFaction('src/read/common/parse-factions.ts', 'header-row-not-found', 'defaulting to row 0');
  return 0;
}

/**
 * Assumptions:
 * - The sheet contains a row with factionid header (scans first 5 rows to handle v3 metadata rows)
 * - There are columns named "factionid", "factionname", "color", "startyear", "endyear" and "sarnalink" (case-insensitive)
 * - The colors are recorded in RGB hex format with a prefixed # symbol (e.g. #A55EA6)
 * TODO all of these assumptions belong in a config file
 *
 * @param rows The data rows, with the rows as the first and the column/cells as the second dimension
 */
export function parseFactions(rows: Array<Array<string>>): Array<Faction> {
  logger.info(`Reading factions ...`);
  const factions: Array<Faction> = [];

  /**if (!rows || !(rows || []).length) {
    logger.info('Faction sheet empty, no factions read.');
    return factions;
  }*/
  if (!rows || rows.length === 0) {
    logger.info(`Faction sheet empty, no factions read.`);
    return factions;
  }

  const headerRowIndex = findHeaderRow(rows);

  // headers: map column titles to column index (with alias support for v3 naming)
  const columnIndexMap: Record<string, number> = {};
  rows[headerRowIndex].forEach((columnName, columnIndex) => {
    const key = (columnName ?? '').toString().toLowerCase();
    columnIndexMap[key] = columnIndex;
    if (key === 'factioncolor') columnIndexMap['color'] = columnIndex;
    if (key === 'startyear') columnIndexMap['startyear'] = columnIndex;
    if (key === 'endyear') columnIndexMap['endyear'] = columnIndex;
  });

  const requiredColumns = ['factionid', 'factionname', 'color', 'startyear', 'endyear'];
  const missingColumns = requiredColumns.filter(col => columnIndexMap[col] === undefined);
  if (missingColumns.length > 0) {
    logger.warn('parse-factions.ts', `Missing required columns: ${missingColumns.join(', ')}`);
  }
  traceFaction('src/read/common/parse-factions.ts', 'column-headers',
    `found=${Object.keys(columnIndexMap).join(',')}, missing=${missingColumns.join(',')}`);

  // read factions
  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    const rawId = row[columnIndexMap['factionid']] ?? '';
    if (!rawId) {
      // no ID -> nothing to do
      continue;
    }

    traceFaction('src/read/common/parse-factions.ts', 'raw-input', rawId);

    const normalizedId = rawId.toString();

    const name = row[columnIndexMap['factionname']] ?? '';
    const color = row[columnIndexMap['color']] ?? '';
    const foundingRaw = row[columnIndexMap['startyear']] ?? '';
    const dissolutionRaw = row[columnIndexMap['endyear']] ?? '';

    const founding = parseInt(foundingRaw, 10);
    const dissolution = parseInt(dissolutionRaw, 10);

    const faction: Faction = {
      id: normalizedId,
      name,
      color,
      founding: !isNaN(founding) ? founding : undefined,
      dissolution: !isNaN(dissolution) ? dissolution : undefined,
    }

    traceFaction('src/read/common/parse-factions.ts', 'normalized', normalizedId);

    factions.push(faction);

  }

  factions.forEach((faction) => {
    traceFaction('src/read/common/parse-factions.ts', 'final-output', faction.id);
    traceFaction('src/read/common/parse-factions.ts', 'REGISTERED FACTION', faction.id);
  });
    // skip factions without an ID
  /**  if (!row[columnIndexMap['factionid']]) {
      continue;
    }

    // parse faction data
    const founding = parseInt(row[columnIndexMap ['startyear']] + '', 10);
    const dissolution = parseInt(row[columnIndexMap['endyear']] + '', 10);
    factions.push({
      id: row[columnIndexMap['factionid']] + '',
      name: row[columnIndexMap['factionname']] + '',
      color: row[columnIndexMap['color']] + '',
      founding: !isNaN(founding) ? founding : undefined,
      dissolution: !isNaN(dissolution) ? dissolution : undefined,
    });
  }*/

  logger.info(`${factions.length} factions read.`);

  if (factions.length === 0) {
    logger.warn('parse-factions.ts', `No factions parsed - check column headers match "factionId" (case-insensitive)`);
  }

  return factions;
}
