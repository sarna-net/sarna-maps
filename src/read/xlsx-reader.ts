import xlsx, { WorkSheet } from 'node-xlsx';
import fs from 'fs';
import { parseEras, parseFactions, parseSystems } from './common';
import { DataSourceConfig } from '../common';

export function readFromXlsxFile(path: string, dataSourceConfig: DataSourceConfig) {
  const worksheets = xlsx.parse(fs.readFileSync(path)) as Array<WorkSheet>;

  const eras = parseEras(worksheets[dataSourceConfig.sheetIndices.columns].data as unknown as Array<Array<string>>);

  return {
    eras,
    factions: parseFactions(worksheets[dataSourceConfig.sheetIndices.factions].data as unknown as Array<Array<string>>),
    systems: parseSystems(worksheets[dataSourceConfig.sheetIndices.systems].data as unknown as Array<Array<string>>, eras),
  };
}
