import { Era, Logger } from '../../common';

/**
 * Assumptions:
 * - All eras are listed in the description sheet
 * - The era titles can be found in the description sheet's second column ("B")
 * - Any entry that has a numeric title (e.g. 2767) is interpreted to be an era
 * - The era descriptions can be found in the description sheet's third column ("C")
 *
 * @param rows The data rows, with the rows as the first and the column/cells as the second dimension
 */
export function parseEras(rows: Array<Array<string>>) {
  Logger.info('Reading eras ...');

  const eras: Array<Era> = [];

  for(const row of rows || []) {
    if (!row[1] || !row[2] || isNaN(parseInt(row[1], 10))) {
      continue;
    }
    eras.push({
      index: eras.length,
      name: row[2],
      year: parseInt(row[1], 10),
    });
  }

  Logger.info(`${eras.length} eras read.`);
  return eras;
}
