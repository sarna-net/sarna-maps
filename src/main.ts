import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import yargsParser from 'yargs-parser';
import {
  Era,
  Faction,
  System,
  GlyphConfig,
  RectangleGrid,
  SystemLabelConfig,
  BorderLabelConfig, GeneratorConfig
} from './common';
import { readConfigFiles, readFromGoogleSheet, readFromXlsxFile } from './read';
import { writeSvgMap } from './render/svg';
import {
  BorderEdgeLoop,
  calculateVoronoiBorders,
  placeAreaLabels,
  placeBorderLabels,
  placeSystemLabels,
} from './compute';
import { restrictSystemsToViewbox } from './compute/restrict-objects-to-viewbox';
import {
  restrictBorderLoopsToViewbox
} from './compute/restrict-objects-to-viewbox/functions/restrict-border-loops-to-viewbox';
import { writeSvgMaps } from './render/svg/write-svg-maps';

console.info(`Sarna map generation script v${process.env.npm_package_version}\n`);

const configPath = path.join(process.cwd(), 'config.env');
dotenv.config({ path: configPath });
const argv = yargsParser(process.argv.slice(2));

console.info(`Configured variables: (from ${configPath}):\n`
  + `GOOGLE_API_KEY: ${(process.env.GOOGLE_API_KEY || '').replace(/./g, 'X')}\n`
  + `GOOGLE_SPREADSHEET_ID: ${process.env.GOOGLE_SPREADSHEET_ID}\n`
  + `LOCAL_XLSX: ${process.env.LOCAL_XLSX}\n`
  + `LOCAL_JSON: ${process.env.LOCAL_DB}\n`
  + `SUCKIT_SHEET_INDEX_COLUMNS: ${process.env.SUCKIT_SHEET_INDEX_COLUMNS}\n`
  + `SUCKIT_SHEET_INDEX_SYSTEMS: ${process.env.SUCKIT_SHEET_INDEX_SYSTEMS}\n`
  + `SUCKIT_SHEET_INDEX_FACTIONS: ${process.env.SUCKIT_SHEET_INDEX_FACTIONS}\n`
  + `SUCKIT_SHEET_INDEX_NEBULAE: ${process.env.SUCKIT_SHEET_INDEX_NEBULAE}\n`
);

async function readConfigs() {
  console.info('Now reading and parsing config files ...');
  // read config files
  const configDirectory = path.join(process.cwd(), process.env.CONFIG_DIR || '');

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
    glyphConfig: path.join(configDirectory, 'glyph.config.yaml'),
    systemLabelConfig: path.join(configDirectory, 'system-label.config.yaml'),
    borderLabelConfig: path.join(configDirectory, 'border-label.config.yaml'),
  });

  console.info('config files read');

  return configs;
}

async function readData() {
  // read config files
  // const configDirectory = path.join(process.cwd(), process.env.CONFIG_DIR || '');
  //
  // const configs = await readConfigFiles({
  //   glyphConfig: path.join(configDirectory, 'glyph.config.yaml'),
  //   systemLabelConfig: path.join(configDirectory, 'system-label.config.yaml'),
  //   borderLabelConfig: path.join(configDirectory, 'border-label.config.yaml'),
  // });

  let sheetData: { eras: Array<Era>; systems: Array<System>; factions: Array<Faction> } = {
    eras: [],
    factions: [],
    systems: [],
  };
  if (process.env.LOCAL_XLSX) {
    const xlsxPath = path.join(process.cwd(), process.env.LOCAL_XLSX);
    console.info(`Attempting to read XLSX at ${xlsxPath}`);
    sheetData = readFromXlsxFile(xlsxPath);
  } else if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_SPREADSHEET_ID) {
    console.info(`Attempting to read Google sheet with ID "${process.env.GOOGLE_SPREADSHEET_ID}"`);
    sheetData = await readFromGoogleSheet(process.env.GOOGLE_SPREADSHEET_ID, process.env.GOOGLE_API_KEY);
  }
  // const eraIndex = result!.eras.findIndex((era) => era.year === 3130);
  // const na = result!.systems.find((system) => system.name === 'Arn');
  // console.info(na);
  // console.info(na?.eraNames[eraIndex - 1], na?.eraNames[eraIndex], na?.eraNames[eraIndex + 1]);
  return sheetData;
}

async function writeMap(
  factions: Array<Faction>,
  systems: Array<System>,
  eras: Array<Era>,
  generatorConfig: GeneratorConfig,
  glyphConfig: GlyphConfig,
  systemLabelConfig: SystemLabelConfig,
  borderLabelConfig: BorderLabelConfig,
) {
  // const viewRect = {
  //   anchor: {
  //     x: -600,
  //     y: -600,
  //   },
  //   dimensions: {
  //     height: 1200,
  //     width: 1300,
  //   },
  // };
  const universeRect = {
    anchor: {
      x: -2000,
      y: -2000,
    },
    dimensions: {
      width: 4000,
      height: 4000,
    },
  };
  const factionMap: Record<string, Faction> = {};
  factions.forEach((faction) => factionMap[faction.id] = faction);

  // //const eraIndex = 15; // 2864
  // // const eraIndex = 16; // 3025
  // // const eraIndex = 25; // 3057
  // // const eraIndex = 30; // 3059 <-- chaos march
  //
  // // const eraIndex = 31; // 3063
  // // const eraIndex = 32; // 3067
  // const eraIndex = 33; // 3068
  // // const eraIndex = 35; // 3079
  // // const eraIndex = 41; // 3145
  // // const eraIndex = 42; // 3151

  await writeSvgMaps(
    generatorConfig,
    glyphConfig,
    systemLabelConfig,
    borderLabelConfig,
    eras,
    factionMap,
    systems,
  );
}

async function run() {
  const {
    generatorConfig,
    glyphConfig,
    systemLabelConfig,
    borderLabelConfig,
  } = await readConfigs();
  const sheetData = await readData();
  await writeMap(
    sheetData.factions,
    sheetData.systems,
    sheetData.eras,
    generatorConfig,
    glyphConfig,
    systemLabelConfig,
    borderLabelConfig,
  );
}

run();
