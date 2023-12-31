import { sheets_v4 } from 'googleapis';
import { parseEras, parseFactions, parseSystems } from './common';

export async function readFromGoogleSheet(spreadsheetId: string, apiKey: string) {
  const sheetIndices = {
    columns: parseInt(process.env.SUCKIT_SHEET_INDEX_COLUMNS || '', 10),
    factions: parseInt(process.env.SUCKIT_SHEET_INDEX_FACTIONS || '', 10),
    systems: parseInt(process.env.SUCKIT_SHEET_INDEX_SYSTEMS || '', 10),
    nebulae: parseInt(process.env.SUCKIT_SHEET_INDEX_NEBULAE || '', 10),
  }

  const sheetsClient = new sheets_v4.Sheets({ auth: apiKey });

  const spreadsheet = (await sheetsClient.spreadsheets.get({
    spreadsheetId,
    //includeGridData: true
  })).data;
  if(!spreadsheet || !spreadsheet.sheets) {
    throw new Error('Cannot read data - No spreadsheet object available');
  }

  const sheetNames = {
    columns: spreadsheet.sheets[sheetIndices.columns]?.properties?.title || '',
    factions: spreadsheet.sheets[sheetIndices.factions]?.properties?.title || '',
    systems: spreadsheet.sheets[sheetIndices.systems]?.properties?.title || '',
    nebulae: spreadsheet.sheets[sheetIndices.nebulae]?.properties?.title || '',
  }

  const dataRanges = await readDataRanges(spreadsheetId, sheetsClient, sheetNames);

  const eras = parseEras(dataRanges[0].values as unknown as Array<Array<string>>);

  return {
    eras,
    factions: parseFactions(dataRanges[1].values as unknown as Array<Array<string>>),
    systems: parseSystems(dataRanges[2].values as unknown as Array<Array<string>>, eras),
  };
}

/**
 * Reads the data ranges for eras, factions, systems and nebulae (in that order).
 *
 * Batching the data ranges here because it only counts as a single request
 * against Google's quota.
 */
async function readDataRanges(
  spreadsheetId: string,
  sheetsClient: sheets_v4.Sheets,
  sheetNames: Record<string, string>,
) {
  if(!sheetNames.columns) {
    throw new Error(`Cannot read data - column sheet name is empty`);
  }
  if(!sheetNames.factions) {
    throw new Error(`Cannot read data - factions sheet name is empty`);
  }
  if(!sheetNames.systems) {
    throw new Error(`Cannot read data - systems sheet name is empty`);
  }
  if(!sheetNames.nebulae) {
    throw new Error(`Cannot read data - nebulae sheet name is empty`);
  }
  const result = (await sheetsClient.spreadsheets.values.batchGet({
    spreadsheetId: spreadsheetId,
    ranges: [
      `${sheetNames.columns}!A1:C200`,
      `${sheetNames.factions}!A1:E1000`,
      `${sheetNames.systems}!A1:AZ10000`,
      `${sheetNames.nebulae}!A1:E200`,
    ],
    majorDimension: 'ROWS'
  })).data;
  if(!result.valueRanges || result.valueRanges.length < 4) {
    throw new Error(`Cannot read data - insufficient data ranges`);
  }
  return result.valueRanges;
}
