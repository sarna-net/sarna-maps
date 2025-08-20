import { parseSingleSystem, SystemRow } from './parse-single-system';
import { Era, logger, System } from '../../common';

/**
 * Assumptions:
 * - The table headers can be found in the sheet's second row
 * - The first eight columns (up to and including column H) contain the following column names, not case-sensitive:
 *    "id", "systemname", "alternatename", "x", "y", "size", "distance (ly)"
 * - Starting from the ninth column (I), the columns are a chronological list of eras (as defined in the description sheet)
 * TODO all of these assumptions belong in a config file
 *
 * @param rows The data rows, with the rows as the first and the column/cells as the second dimension
 * @param eras The previously parsed eras array
 */
export function parseSystems(rows: Array<Array<string>>, eras: Array<Era>) {
  const FIRST_ERA_COLUMN_INDEX = 8;
  const HEADER_ROW_INDEX = 1;

  const systems: Array<System> = [];

  logger.info('Reading systems ...');

  if (!rows || !(rows || []).length) {
    logger.info('Systems sheet empty, no factions read.');
    return [] as Array<System>;
  }

  // headers: map column titles (lowercase) to column index
  const columnIndexMap: Record<string, number> = {};
  for (let i = 0; i < rows[HEADER_ROW_INDEX].length; i++) {
    if (i < FIRST_ERA_COLUMN_INDEX) {
      columnIndexMap[(rows[HEADER_ROW_INDEX][i] + '').toLowerCase()] = i;
    } else {
      columnIndexMap['era_' + (i - FIRST_ERA_COLUMN_INDEX)] = i;
    }
  }

  for (let rowIndex = HEADER_ROW_INDEX + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    // skip systems without coordinates
    if (isNaN(row[columnIndexMap['x']] as unknown as number) || isNaN(row[columnIndexMap['y']] as unknown as number)) {
      continue;
    }

    const rowToParse: SystemRow = {
      id: row[columnIndexMap['id']] + '',
      name: row[columnIndexMap['systemname']] + '',
      alternateNames: row[columnIndexMap['alternatename']] + '',
      x: parseFloat(row[columnIndexMap['x']] as string),
      y: parseFloat(row[columnIndexMap['y']] as string),
      size: ((row[columnIndexMap['size']] + '') || '1,1,0')
        .split(',')
        .map((element) => parseFloat(element)
        ) as [number, number, number],
      eraAffiliations: eras.map((_, eraIndex) => row[columnIndexMap['era_' + eraIndex]] || 'U'),
    }

    systems.push(parseSingleSystem('system-' + rowIndex, rowToParse, eras));
  }

  // sort systems so that clusters are painted first and appear at the bottom (visually)
  systems.sort((a,b) => (b.radiusX + b.radiusY) - (a.radiusX + a.radiusY));

  logger.info(`${systems.length} systems read.`);
  return systems;
}
