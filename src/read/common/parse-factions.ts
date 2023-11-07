import { Faction, Logger } from '../../common';

/**
 * Assumptions:
 * - The sheet's first row contains the headers
 * - There are columns named "id", "factionname", "color", "foundingyear" and "dissolutionyear" (case-insensitive)
 * - The colors are recorded in RGB hex format with a prefixed # symbol (e.g. #A55EA6)
 *
 * @param rows The data rows, with the rows as the first and the column/cells as the second dimension
 */
export function parseFactions(rows: Array<Array<string>>) {
  Logger.info(`Reading factions ...`);
  const factions: Array<Faction> = [];

  if (!rows || !(rows || []).length) {
    Logger.info('Faction sheet empty, no factions read.');
    return factions;
  }

  // headers: map column titles (lowercase) to column index
  const columnIndexMap: Record<string, number> = {};
  rows[0].forEach((columnName, columnIndex) => {
    columnIndexMap[(columnName + '').toLowerCase()] = columnIndex;
  });

  // read factions
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    // skip factions without an ID
    if (!row[columnIndexMap['id']]) {
      continue;
    }

    // parse faction data
    const founding = parseInt(row[columnIndexMap ['foundingyear']] + '', 10);
    const dissolution = parseInt(row[columnIndexMap['dissolutionyear']] + '', 10);
    factions.push({
      id: row[columnIndexMap['id']] + '',
      name: row[columnIndexMap['factionname']] + '',
      color: row[columnIndexMap['color']] + '',
      founding: !isNaN(founding) ? founding : undefined,
      dissolution: !isNaN(dissolution) ? dissolution : undefined,
    });
  }

  Logger.info(`${factions.length} factions read.`);
  return factions;
}
