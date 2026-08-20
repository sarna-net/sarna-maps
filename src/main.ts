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
import { readConfigFiles, readFromGoogleSheet, readFromCsvFiles } from './read';
import { writeSvgMaps } from './render/svg/write-svg-maps';

logSettings.level = LOGGER_LEVELS.All;
logger.info(`Sarna map generation script v${process.env.npm_package_version}\n`);

const argv = yargsParser(process.argv.slice(2));

async function readConfigs() {
  logger.info('Now reading and parsing config files ...');
  // read config files
  const configDirectory = path.join(process.cwd(), 'config');

  if (!argv._?.length) {
    logger.error('main.ts', 'No config filename provided. Please provide it as this script\'s first parameter.');
    process.exit(1);
  }

  let generatorConfigPath = String(argv._[0]);
  if (!fs.existsSync(generatorConfigPath)) {
    generatorConfigPath = path.join(configDirectory, generatorConfigPath);
    if (!fs.existsSync(generatorConfigPath)) {
      generatorConfigPath += '.config.yaml';
    }
    if (!fs.existsSync(generatorConfigPath)) {
      logger.error('main.ts', `Config file does not exist at "${argv._[0]}"`);
      process.exit(1);
    } else {
      logger.info(`Config filename "${argv._[0]}" was interpreted as "${generatorConfigPath}"`);
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

// src/main.ts

async function readData(dataSourceConfig: DataSourceConfig) {
  if (dataSourceConfig.useSource === 'google') {
    return await readFromGoogleSheet(dataSourceConfig);
  }

  if (!dataSourceConfig.localFileConfig) {
    throw new Error('localFileConfig is required when useSource is set to "local"');
  }

  const { directory, systemsFilename, factionsFilename, descriptionFilename } = dataSourceConfig.localFileConfig;

  // Reject absolute paths
  if (path.isAbsolute(directory)) {
    throw new Error(`Absolute paths are not allowed in localFileConfig.directory: ${directory}`);
  }

  // Resolve path relative to project root
  const projectRoot = process.cwd();
  const resolvedDir = path.resolve(projectRoot, directory);

  // Ensure resolved path is still inside project root (prevents ../ traversal)
  if (path.relative(projectRoot, resolvedDir).startsWith('..')) {
    throw new Error(`Invalid directory path (escapes project root): ${directory}`);
  }

  const systemsPath = path.join(resolvedDir, systemsFilename);

  // Validate file exists
  if (!fs.existsSync(systemsPath)) {
    throw new Error(`Systems CSV file not found at path: ${systemsPath}`);
  }

  const factionsPath = factionsFilename ? path.join(resolvedDir, factionsFilename) : undefined;
  const descriptionPath = descriptionFilename ? path.join(resolvedDir, descriptionFilename) : undefined;

  logger.info(`Reading local CSV files from: ${resolvedDir}`);

  return readFromCsvFiles(systemsPath, factionsPath, descriptionPath, dataSourceConfig);
}

async function run() {
  const {
    generatorConfig,
    dataSourceConfig,
    glyphConfig,
    systemLabelConfig,
    borderLabelConfig,
  } = await readConfigs();
  if (!generatorConfig.debugMode) {
    logSettings.level = LOGGER_LEVELS.NoLogsOrDebug;
  }

  // Faction traversal logger configured via config/global/faction-traversal.config.yaml
  // No programmatic overrides - YAML config is the only method

  const sheetData = await readData(dataSourceConfig);
  // FactionRegistry: canonical map keyed case-insensitively.
  // Preserve original id for display (AuC) but also index by upper-case to guarantee
  // `resolveFactionRenderStyle` finds mixed-case ids (AuC, CoF, SiS) when normalized
  // keys arrive as AUC/COF. This is the single source of truth for faction lookup.
  const factionMap: Record<string, Faction> = {};
  sheetData.factions.forEach((faction: Faction) => {
    factionMap[faction.id] = faction;
    factionMap[faction.id.toUpperCase()] = faction;
  });

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
