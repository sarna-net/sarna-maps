import xlsx, { WorkSheet } from 'node-xlsx';
import fs from 'fs';
import { parseEras, parseFactions, parseSystems } from './common';

export function readFromXlsxFile(path: string) {
  const worksheets = xlsx.parse(fs.readFileSync(path)) as Array<WorkSheet>;
  const sheetIndices = {
    columns: parseInt(process.env.SUCKIT_SHEET_INDEX_COLUMNS || '', 10),
    factions: parseInt(process.env.SUCKIT_SHEET_INDEX_FACTIONS || '', 10),
    systems: parseInt(process.env.SUCKIT_SHEET_INDEX_SYSTEMS || '', 10),
  }

  const eras = parseEras(worksheets[sheetIndices.columns].data as unknown as Array<Array<string>>);

  return {
    eras,
    factions: parseFactions(worksheets[sheetIndices.factions].data as unknown as Array<Array<string>>),
    systems: parseSystems(worksheets[sheetIndices.systems].data as unknown as Array<Array<string>>, eras),
  };
}
