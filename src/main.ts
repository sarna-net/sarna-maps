import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import yargsParser from 'yargs-parser';
import { Era, Faction, Nebula, System, VoronoiBorder, PoissonDisc, VoronoiCellMode } from './mapgen';
import { extractBorderStateAffiliation, Logger } from './utils';
import { SuckitReader } from './reader';
import { SvgWriter } from './writer';

Logger.info(`Sarna map generation script v${process.env.npm_package_version}\n`);

const configPath = path.join(process.cwd(), 'config.env');
dotenv.config({ path: configPath });
const argv = yargsParser(process.argv.slice(2));

Logger.info(`Configured variables: (from ${configPath}):\n` 
  + `GOOGLE_API_KEY: ${process.env.GOOGLE_API_KEY}\n`
  + `SUCKIT_SPREADSHEET_ID: ${process.env.SUCKIT_SPREADSHEET_ID}\n`
  + `LOCAL_DB: ${process.env.LOCAL_DB}\n`
);

async function readData() {
  let eras;
  let factions;
  let systems;
  let nebulae;
  if (process.env.LOCAL_DB) {
    const filePath = path.join(__dirname, '..', process.env.LOCAL_DB);
    const readResult = fs.readFileSync(filePath, { encoding: 'utf8' });
    const readObject = JSON.parse(readResult);
    eras = readObject.eras as Era[];
    factions = readObject.factions as Record<string, Faction>;
    systems = readObject.systems as System[];
    nebulae = readObject.nebulae as Nebula[];
    Logger.info(`Done reading local file`);
  } else {
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
    // { eras, factions, systems, nebulae }
    const readResult = await reader.readDataFromSpreadsheet();
    eras = readResult.eras;
    factions = readResult.factions;
    systems = readResult.systems;
    nebulae = readResult.nebulae;
    Logger.info(`Done reading google sheet`);
  }

  // start generating map image
  // generate poisson disc and place systems as reserved points
  const poisson = new PoissonDisc(-2000, -2000, 4000, 4000, 35, 30).run();
  poisson.replaceReservedPoints(systems.map((system) => ({
    x: system.x,
    y: system.y,
    color: extractBorderStateAffiliation(system.eraAffiliations[15]),
  })));
  // convert systems into voronoi nodes
  const delaunayVertices = poisson.aggregatedPoints
    .filter((point) => point.color !== 'A' && point.color !== 'U' && point.color !== '')
    .map((point) => ({
      ...point,
      adjacentTriIndices: [],
    }));
  const {
    delaunayTriangles,
    voronoiNodes,
    borderEdges,
    borderLoops,
  } = await VoronoiBorder.calculateBorders(
    delaunayVertices,
  );

  SvgWriter.writeSvgMap(
    poisson,
    systems,
    factions,
    delaunayVertices,
    delaunayTriangles,
    voronoiNodes,
    borderEdges,
    borderLoops,
    {
      dimensions: {
        height: 1200,
        width: 1300,
      },
      name: 'test',
      viewRect: {
        anchor: {
          x: -600,
          y: -600,
        },
        dimensions: {
          height: 1200,
          width: 1300,
        },
      },
      // displayDelaunayTriangles: true,
      // displayVoronoiNodes: true,
      displayBorderEdges: true,
    },
  );

  Logger.info('DONE');
}

// run the algorithm
readData();
