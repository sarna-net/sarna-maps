import path from 'path';
import fs from 'fs';
import yargsParser from 'yargs-parser';
import {
  Era,
  Faction,
  System,
  DataSourceConfig,
} from './common';
import { readConfigFiles, readFromGoogleSheet, readFromXlsxFile } from './read';
import { writeSvgMaps } from './render/svg/write-svg-maps';

console.info(`Sarna map generation script v${process.env.npm_package_version}\n`);

// const configPath = path.join(process.cwd(), 'config.env');
// dotenv.config({ path: configPath });
const argv = yargsParser(process.argv.slice(2));

// console.info(`Configured variables: (from ${configPath}):\n`
//   + `GOOGLE_API_KEY: ${(process.env.GOOGLE_API_KEY || '').replace(/./g, 'X')}\n`
//   + `GOOGLE_SPREADSHEET_ID: ${process.env.GOOGLE_SPREADSHEET_ID}\n`
//   + `LOCAL_XLSX: ${process.env.LOCAL_XLSX}\n`
//   + `LOCAL_JSON: ${process.env.LOCAL_DB}\n`
//   + `SUCKIT_SHEET_INDEX_COLUMNS: ${process.env.SUCKIT_SHEET_INDEX_COLUMNS}\n`
//   + `SUCKIT_SHEET_INDEX_SYSTEMS: ${process.env.SUCKIT_SHEET_INDEX_SYSTEMS}\n`
//   + `SUCKIT_SHEET_INDEX_FACTIONS: ${process.env.SUCKIT_SHEET_INDEX_FACTIONS}\n`
//   + `SUCKIT_SHEET_INDEX_NEBULAE: ${process.env.SUCKIT_SHEET_INDEX_NEBULAE}\n`
// );

async function readConfigs() {
  console.info('Now reading and parsing config files ...');
  // read config files
  const configDirectory = path.join(process.cwd(), 'config');

  if (!argv._?.length) {
    console.error('No config filename provided. Please provide it as this script\'s first parameter.');
    process.exit(1);
  }

  let generatorConfigPath = String(argv._[0]);
  if (!fs.existsSync(generatorConfigPath)) {
    generatorConfigPath = path.join(configDirectory, generatorConfigPath);
    if (!fs.existsSync(generatorConfigPath)) {
      console.error(`Config file does not exist at "${argv._[0]}"`);
      process.exit(1);
    }
  }

  const configs = await readConfigFiles({
    generatorConfig: generatorConfigPath,
    dataSourceConfig: path.join(configDirectory, 'global', 'data-source.config.yaml'),
    glyphConfig: path.join(configDirectory, 'global', 'glyph.config.yaml'),
    systemLabelConfig: path.join(configDirectory, 'global', 'system-label.config.yaml'),
    borderLabelConfig: path.join(configDirectory, 'global', 'border-label.config.yaml'),
  });

  console.info('config files read');

  return configs;
}

async function readData(dataSourceConfig: DataSourceConfig) {
  let sheetData: { eras: Array<Era>; systems: Array<System>; factions: Array<Faction> };
  if (dataSourceConfig.useSource === 'google') {
    console.info(`Attempting to read Google sheet with ID "${dataSourceConfig.googleSheetsConfig?.spreadsheetId}"`);
    sheetData = await readFromGoogleSheet(dataSourceConfig);
  } else {
    const xlsxPath = path.join(
      process.cwd(),
      dataSourceConfig.localFileConfig?.directory || '',
      dataSourceConfig.localFileConfig?.filename || '',
    );
    console.info(`Attempting to read XLSX at ${xlsxPath}`);
    sheetData = readFromXlsxFile(xlsxPath, dataSourceConfig);
  }
  return sheetData;
}

async function run() {
  const {
    generatorConfig,
    dataSourceConfig,
    glyphConfig,
    systemLabelConfig,
    borderLabelConfig,
  } = await readConfigs();
  const sheetData = await readData(dataSourceConfig);
  const factionMap: Record<string, Faction> = {};
  sheetData.factions.forEach((faction) => factionMap[faction.id] = faction);

  await writeSvgMaps(
    generatorConfig,
    glyphConfig,
    systemLabelConfig,
    borderLabelConfig,
    sheetData.eras,
    factionMap,
    sheetData.systems,
  );
}

run();
