import path from 'path';
import dotenv from 'dotenv';
import yargsParser from 'yargs-parser';
import {
  Era,
  Faction,
  Logger,
  System,
  GlyphConfig,
  RectangleGrid,
  SystemLabelConfig,
  BorderLabelConfig
} from './common';
import { readConfigFiles, readFromGoogleSheet, readFromXlsxFile } from './read';
import { writeSvgMap } from './render/svg';
import {
  calculateVoronoiBorders,
  placeAreaLabels,
  placeBorderLabels,
  placeSystemLabels,
} from './compute';

Logger.info(`Sarna map generation script v${process.env.npm_package_version}\n`);

const configPath = path.join(process.cwd(), 'config.env');
dotenv.config({ path: configPath });
const argv = yargsParser(process.argv.slice(2));

Logger.info(`Configured variables: (from ${configPath}):\n`
  + `GOOGLE_API_KEY: ${(process.env.GOOGLE_API_KEY || '').replace(/./g, 'X')}\n`
  + `GOOGLE_SPREADSHEET_ID: ${process.env.GOOGLE_SPREADSHEET_ID}\n`
  + `LOCAL_XLSX: ${process.env.LOCAL_XLSX}\n`
  + `LOCAL_JSON: ${process.env.LOCAL_DB}\n`
  + `SUCKIT_SHEET_INDEX_COLUMNS: ${process.env.SUCKIT_SHEET_INDEX_COLUMNS}\n`
  + `SUCKIT_SHEET_INDEX_SYSTEMS: ${process.env.SUCKIT_SHEET_INDEX_SYSTEMS}\n`
  + `SUCKIT_SHEET_INDEX_FACTIONS: ${process.env.SUCKIT_SHEET_INDEX_FACTIONS}\n`
  + `SUCKIT_SHEET_INDEX_NEBULAE: ${process.env.SUCKIT_SHEET_INDEX_NEBULAE}\n`
);

async function readData() {
  // read config files
  const configDirectory = path.join(process.cwd(), process.env.CONFIG_DIR || '');

  const configs = await readConfigFiles({
    glyphConfig: path.join(configDirectory, 'glyph-config.yaml'),
    systemLabelConfig: path.join(configDirectory, 'system-label-config.yaml'),
    borderLabelConfig: path.join(configDirectory, 'border-label-config.yaml'),
  })

  let sheetData: { eras: Array<Era>; systems: Array<System>; factions: Array<Faction> } = {
    eras: [],
    factions: [],
    systems: [],
  };
  if (process.env.LOCAL_XLSX) {
    const xlsxPath = path.join(process.cwd(), process.env.LOCAL_XLSX);
    Logger.info(`Attempting to read XLSX at ${xlsxPath}`);
    sheetData = readFromXlsxFile(xlsxPath);
  } else if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_SPREADSHEET_ID) {
    Logger.info(`Attempting to read Google sheet with ID "${process.env.GOOGLE_SPREADSHEET_ID}"`);
    sheetData = await readFromGoogleSheet(process.env.GOOGLE_SPREADSHEET_ID, process.env.GOOGLE_API_KEY);
  }
  // const eraIndex = result!.eras.findIndex((era) => era.year === 3130);
  // const na = result!.systems.find((system) => system.name === 'Arn');
  // Logger.info(na);
  // Logger.info(na?.eraNames[eraIndex - 1], na?.eraNames[eraIndex], na?.eraNames[eraIndex + 1]);
  return {
    sheetData,
    ...configs,
  };
}

async function writeMap(
  factions: Array<Faction>,
  systems: Array<System>,
  eras: Array<Era>,
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
  const viewRect = {
    anchor: {
      x: -2000,
      y: -2000,
    },
    dimensions: {
      height: 4000,
      width: 4000,
    },
  };
  const factionMap: Record<string, Faction> = {};
  factions.forEach((faction) => factionMap[faction.id] = faction);
  //const eraIndex = 15; // 2864
  // const eraIndex = 16; // 3025
  // const eraIndex = 25; // 3057
  // const eraIndex = 30; // 3059 <-- chaos march

  // const eraIndex = 31; // 3063
  // const eraIndex = 32; // 3067
  const eraIndex = 33; // 3068
  // const eraIndex = 35; // 3079
  // const eraIndex = 41; // 3145
  // const eraIndex = 42; // 3151
  Logger.info(eras.find((era) => era.index === eraIndex));

  // TODO put these settings into a config file
  const poissonSettings = {
    origin: { x: -2000, y: -2000 },
    dimensions: { width: 4000, height: 4000 },
    radius: 30,
    maxSamples: 30,
    seed: 'sarna',
  }

  // Perform voronoi border calculations
  const {
    poissonDisc,
    delaunayTriangles,
    delaunayVertices,
    voronoiNodes,
    unmodifiedBorderEdges,
    borderEdges,
    borderSections,
    borderLoops,
    threeWayNodes,
  } = await calculateVoronoiBorders(
    systems,
    eras[eraIndex],
    poissonSettings,
  );
  // Create a rectangle grid that will let us check for label collisions
  const grid = new RectangleGrid(viewRect);
  // Place system labels
  const systemLabels = placeSystemLabels(viewRect, eraIndex, systems, grid, glyphConfig, systemLabelConfig);
  // Place border labels
  const borderLabels = placeBorderLabels(viewRect, eraIndex, factionMap, borderLoops || {}, grid, glyphConfig, borderLabelConfig);

  // const lcBorderLoops = voronoiResult.borderLoops?.LC;
  // const {
  //   delaunayTriangles: areaLabelTriangles,
  //   voronoi: areaLabelVoronoi,
  //   graphEdges: areaLabelGraphEdges,
  //   longestPath: areaLabelPath,
  // } = await placeAreaLabels(lcBorderLoops as Array<BorderEdgeLoop>);
  const factionLabels = await placeAreaLabels(factions, borderLoops);

  writeSvgMap(
    eraIndex,
    systems,
    factionMap,
    poissonDisc,
    delaunayVertices,
    delaunayTriangles,
    voronoiNodes,
    unmodifiedBorderEdges || borderEdges,
    borderSections,
    borderLoops || {}, // borderLoops
    threeWayNodes,
    {}, // borderEdgesMap,
    borderLabels,
    [],
    systemLabels,
    factionLabels,
    {
      dimensions: {
        height: 4000,
        width: 4000,
        // height: 1200,
        // width: 1300,
      },
      name: 'test',
      viewRect,
      displayPointsOfInterest: true,
      displayPoissonPoints: false,
      displayDelaunayTriangles: false,
      displayVoronoiNodes: false,
      displayBorderEdges: false,
      displayBorderSections: false,
      displayBorders: true,
      curveBorderEdges: true,
      factions: {
        displayBorderLabels: true,
      }
    },
  );
}

async function run() {
  const {
    sheetData,
    glyphConfig,
    systemLabelConfig,
    borderLabelConfig,
  } = await readData();
  await writeMap(
    sheetData.factions,
    sheetData.systems,
    sheetData.eras,
    glyphConfig,
    systemLabelConfig,
    borderLabelConfig,
  );
}

run();
