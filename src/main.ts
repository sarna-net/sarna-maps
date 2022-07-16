import * as path from 'path';
import dotenv from 'dotenv';
import yargsParser from 'yargs-parser';
import { SuckitReader } from './mapgen';
import { Logger } from './utils';

Logger.info(`Sarna map generation script v${process.env.npm_package_version}\n`);

const configPath = path.join(process.cwd(), 'config.env');
dotenv.config({ path: configPath });
const argv = yargsParser(process.argv.slice(2));

Logger.info(`Configured variables: (from ${configPath}):\n` 
  + `GOOGLE_API_KEY: ${process.env.GOOGLE_API_KEY}\n`
  + `SUCKIT_SPREADSHEET_ID: ${process.env.SUCKIT_SPREADSHEET_ID}\n`
);

async function readData() {
  const reader = new SuckitReader(
    process.env.GOOGLE_API_KEY || '',
    process.env.SUCKIT_SPREADSHEET_ID || '',
    {
      columnsSheet: Number.parseInt(process.env.SUCKIT_SHEET_INDEX_COLUMNS || '', 10) || 0,
      systemsSheet: Number.parseInt(process.env.SUCKIT_SHEET_INDEX_SYSTEMS || '', 10) || 0,
      factionsSheet: Number.parseInt(process.env.SUCKIT_SHEET_INDEX_FACTIONS || '', 10) || 0,
      nebulaeSheet: Number.parseInt(process.env.SUCKIT_SHEET_INDEX_NEBULAE || '', 10) || 0,
    },
  );
  const { eras, factions, systems, nebulae } = await reader.readDataFromSpreadsheet();
  Logger.info('systems', systems);
}

// run the algorithm
readData();
