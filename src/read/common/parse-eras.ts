import { Era } from '../../common';

/**
 * Assumptions:
 * - All eras are listed in the description sheet
 * - The era titles can be found in the description sheet's second column ("B")
 * - Any entry that has a numeric title (e.g. 2767) is interpreted to be an era
 * - The era descriptions can be found in the description sheet's third column ("C")
 * TODO all of these assumptions belong in a config file
 *
 * @param rows The data rows, with the rows as the first and the column/cells as the second dimension
 */
export function parseEras(rows: Array<Array<string>>) {
  console.info('Reading eras ...');

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

  console.info(`${eras.length} eras read.`);
  return eras;
}
