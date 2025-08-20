import path from 'path';
import fs from 'fs';
import yargsParser from 'yargs-parser';
import {
  Era,
  Faction,
  System,
  DataSourceConfig,
  logger, LOGGER_LEVELS, logSettings,
} from './common';
import { readConfigFiles, readFromGoogleSheet, readFromXlsxFile } from './read';
import { writeSvgMaps } from './render/svg/write-svg-maps';

logSettings.level = LOGGER_LEVELS.All;
logger.info(`Sarna map generation script v${process.env.npm_package_version}\n`);

const argv = yargsParser(process.argv.slice(2));

async function readConfigs() {
  logger.info('Now reading and parsing config files ...');
  // read config files
  const configDirectory = path.join(process.cwd(), 'config');

  if (!argv._?.length) {
    logger.error('No config filename provided. Please provide it as this script\'s first parameter.');
    process.exit(1);
  }

  let generatorConfigPath = String(argv._[0]);
  if (!fs.existsSync(generatorConfigPath)) {
    generatorConfigPath = path.join(configDirectory, generatorConfigPath);
    if (!fs.existsSync(generatorConfigPath)) {
      generatorConfigPath += '.config.yaml';
    }
    if (!fs.existsSync(generatorConfigPath)) {
      logger.error(`Config file does not exist at "${argv._[0]}"`);
      process.exit(1);
    } else {
      logger.info(`Config filename "${argv._[0]}" was transformed to "${generatorConfigPath}"`);
    }
  }

  const configs = await readConfigFiles({
    generatorConfig: generatorConfigPath,
    dataSourceConfig: path.join(configDirectory, 'global', 'data-source.config.yaml'),
    glyphConfig: path.join(configDirectory, 'global', 'glyph.config.yaml'),
    systemLabelConfig: path.join(configDirectory, 'global', 'system-label.config.yaml'),
    borderLabelConfig: path.join(configDirectory, 'global', 'border-label.config.yaml'),
  });

  logger.info('config files read');

  return configs;
}

async function readData(dataSourceConfig: DataSourceConfig) {
  let sheetData: { eras: Array<Era>; systems: Array<System>; factions: Array<Faction> };
  if (dataSourceConfig.useSource === 'google') {
    logger.info(`Attempting to read Google sheet with ID "${dataSourceConfig.googleSheetsConfig?.spreadsheetId}"`);
    sheetData = await readFromGoogleSheet(dataSourceConfig);
  } else {
    const xlsxPath = path.join(
      process.cwd(),
      dataSourceConfig.localFileConfig?.directory || '',
      dataSourceConfig.localFileConfig?.filename || '',
    );
    logger.info(`Attempting to read XLSX at ${xlsxPath}`);
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
