import { Logger } from '../utils';
import { sheets_v4 } from 'googleapis';
import { Era, Faction, Nebula, System } from '../mapgen/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * An instance of this class reads the eras, factions, planetary systems and
 * nebulae from the SUCKit or any other Google Sheets workbook, provided that
 * workbook adheres to the same format as the SUCKit, and is readable by anyone.
 */
export class SuckitReader {
  private static SYSTEMS_SHEET_FIRST_ERA_COLUMN = 8;

  private spreadsheetId: string;
  private sheetsClient: sheets_v4.Sheets;

  private sheetIndices: {
    columnsSheet: number;
    systemsSheet: number;
    factionsSheet: number;
    nebulaeSheet: number;
  } = {
    columnsSheet: -1,
    systemsSheet: -1,
    factionsSheet: -1,
    nebulaeSheet: -1,
  };

  private columnsSheetName = '';
  private factionsSheetName = '';
  private systemsSheetName = '';
  private nebulaeSheetName = '';

  private eras: Era[] = [];
  private factions: Record<string,Faction>;
  private systems: System[] = [];
  private nebulae: Nebula[] = [];

  constructor(
    googleApiKey: string,
    spreadsheetId: string,
    sheetIndices: {
      columnsSheet: number;
      systemsSheet: number;
      factionsSheet: number;
      nebulaeSheet: number;
    },
  ) {
    this.spreadsheetId = spreadsheetId;
    this.sheetsClient = new sheets_v4.Sheets({ auth: googleApiKey });
    this.sheetIndices = sheetIndices;
    this.factions = {};
  }

  /**
   * Reads the workbook.
   */
  public async readDataFromSpreadsheet() {
    Logger.log(`Preparing to read data from sheet "${this.spreadsheetId}"`);
    const spreadsheet = (await this.sheetsClient.spreadsheets.get({
      spreadsheetId: this.spreadsheetId
      //includeGridData: true
    })).data;
    if(!spreadsheet || !spreadsheet.sheets) {
      throw new Error('Cannot read data - No spreadsheet object available');
    }
    if(spreadsheet.sheets.length < 6) {
      throw new Error(`Cannot read data - Spreadsheet has ${spreadsheet.sheets.length} sheets instead of the expected 6.`);
    }

    this.columnsSheetName =
      spreadsheet.sheets[this.sheetIndices.columnsSheet]?.properties?.title || '';
    this.factionsSheetName =
      spreadsheet.sheets[this.sheetIndices.factionsSheet]?.properties?.title || '';
    this.systemsSheetName = 
      spreadsheet.sheets[this.sheetIndices.systemsSheet]?.properties?.title || '';
    this.nebulaeSheetName =
      spreadsheet.sheets[this.sheetIndices.nebulaeSheet]?.properties?.title || '';

    const dataRanges = await this.readDataRanges();
    await this.parseEras(dataRanges[0]);
    await this.parseFactions(dataRanges[1]);
    await this.parseSystems(dataRanges[2]);
    await this.parseNebulae(dataRanges[3]);

    // save results to file
    const outFilePath = path.join(__dirname, '..', '..', 'out', 'read-result.json');
    fs.writeFileSync(
      outFilePath,
      JSON.stringify(
        {
          eras: this.eras,
          factions: this.factions,
          systems: this.systems,
          nebulae: this.nebulae,
        },
        null,
        2
      ),
    );
    Logger.info(`Read result saved to "${outFilePath}"`);

    return {
      eras: this.eras,
      factions: this.factions,
      systems: this.systems,
      nebulae: this.nebulae
    };
  }

  /**
   * Reads the data ranges for eras, factions, systems and nebulae (in that order).
   *
   * Batching the data ranges here because it only counts as a single request
   * against Google's quota.
   */
  private async readDataRanges() {
    if(!this.columnsSheetName) {
      throw new Error(`Cannot read data - column sheet name is empty`);
    }
    if(!this.factionsSheetName) {
      throw new Error(`Cannot read data - factions sheet name is empty`);
    }
    if(!this.systemsSheetName) {
      throw new Error(`Cannot read data - systems sheet name is empty`);
    }
    if(!this.nebulaeSheetName) {
      throw new Error(`Cannot read data - nebulae sheet name is empty`);
    }
    const result = (await this.sheetsClient.spreadsheets.values.batchGet({
      spreadsheetId: this.spreadsheetId,
      ranges: [
        `${this.columnsSheetName}!B2:C100`,
        `${this.factionsSheetName}!A2:E500`,
        `${this.systemsSheetName}!A3:AZ4000`,
        `${this.nebulaeSheetName}!A2:E100`,
      ],
      majorDimension: 'ROWS'
    })).data;
    if(!result.valueRanges || result.valueRanges.length < 4) {
      throw new Error(`Cannot read data - insufficient data ranges`);
    }
    return result.valueRanges;
  }

  /**
   * Parses the available eras from the workbook's descriptions sheet.
   */
  private async parseEras(rowRange: sheets_v4.Schema$ValueRange) {
    Logger.info(`Now parsing era data`);
    this.eras = [];

    for(const row of rowRange.values || []) {
      if(!row[0] || !row[1] || isNaN(parseInt(row[0], 10))) {
        continue;
      }
      this.eras.push({
        index: this.eras.length,
        year: parseInt(row[0], 10),
        name: row[1]
      });
    }

    Logger.info(`Done parsing ${this.eras.length} eras`);
  }

  /**
   * Parses the available factions from the workbook's faction sheet.
   */
  private async parseFactions(rowRange: sheets_v4.Schema$ValueRange) {
    Logger.info(`Now parsing faction data`);
    this.factions = {};

    let faction: Faction;
    for(const row of rowRange.values || []) {
      if(!row[0]) {
        continue;
      }
      faction = {
        id: row[0],
        name: row[1],
        color: row[2],
        founding: parseInt(row[3], 10) || undefined,
        dissolution: parseInt(row[4], 10) || undefined
      };
      this.factions[faction.id] = faction;
    }

    Logger.info(`Done parsing ${this.factions.size} factions`);
  }

  /**
   * Parses the available systems and clusters from the workbook's systems sheet.
   */
  private async parseSystems(rowRange: sheets_v4.Schema$ValueRange) {
    Logger.info(`Now parsing system data`);
    this.systems = [];

    let system: System;
    let alternateNames: string;
    let renames: {year: number, name: string}[];
    let size: string;

    (rowRange.values || []).forEach((row) => {
      system = {
        name: row[1],
        fullName: row[1],
         // for values >= 1000, the spreadsheet sets them as "1,000", which does not play well with parseFloat
        x: parseFloat(row[3].replaceAll(',', '')),
        y: parseFloat(row[4].replaceAll(',', '')),
        // final values for these fields are calculated later on:
        radiusX: 1,
        radiusY: 1,
        rotation: 0,
        isCluster: false,
        eraAffiliations: [],
        eraCapitalLevels: [],
        eraNames: []
      };
      alternateNames = row[2];
      size = row[5];

      // skip systems without name or coordinates
      if(!system.name || system.x === undefined || isNaN(system.x) || system.y === undefined || isNaN(system.y)) {
        return;
      }

      // Alternate names:
      // relevant alternate names occur as "Tiverton (3022+)"
      // or "Chadan (2890+), Chandan (3022+)" or "Chadan (2890+) / Chandan (3022+)"
      renames = [];
      const alternateNamesArr = alternateNames.split(/\s*[,/]\s*/);
      // translate the resulting strings into objects and remember them as renames
      alternateNamesArr.forEach((nameChange) => {
        // disregard any alternate names without an attached year in parentheses
        const regexResult = nameChange.match(/(.*)\s*\((\d+).*\)/i);
        if(!regexResult) {
          return;
        }
        renames.push({
          year: parseInt(regexResult[2], 10),
          name: regexResult[1].trim()
        });
      });
      // sort renames by year
      renames.sort((a,b) => a.year - b.year);

      // scale and rotation
      let scaleArr = (size || '1,1,0').split(',');
      if(scaleArr.length === 0 || !scaleArr[0].trim()) {
        scaleArr = ['1', '1', '0'];
      } else if(scaleArr.length === 1) {
        scaleArr.push(scaleArr[0]);
        scaleArr.push('0');
      } else if(scaleArr.length === 2) {
        scaleArr.push('0');
      }
      system.radiusX = parseFloat(scaleArr[0]);
      system.radiusY = parseFloat(scaleArr[1]);
      system.rotation = parseFloat(scaleArr[2]);

      // era affiliations, capital system levels and era-specific names
      let era, affiliation;
      for(let eraIndex = 0; eraIndex < this.eras.length; eraIndex++) {
        era = this.eras[eraIndex];
        affiliation = row[SuckitReader.SYSTEMS_SHEET_FIRST_ERA_COLUMN + eraIndex] || '';
        system.eraAffiliations.push(affiliation);
        // determine whether the system is any sort of capital in this era
        if(affiliation.match(/faction capital/gi)) {
          system.eraCapitalLevels.push(1);
        } else if(affiliation.match(/major capital/gi)) {
          system.eraCapitalLevels.push(2);
        } else if(affiliation.match(/minor capital/gi)) {
          system.eraCapitalLevels.push(3);
        } else {
          system.eraCapitalLevels.push(0);
        }
        // determine the system's name in this era
        // default is the regular name
        system.eraNames.push(system.name.replace(/\s*\([^)]+\)\s*/gi, ''));
        for(const rename of renames) {
          if(era.year >= rename.year) {
            system.eraNames.pop();
            system.eraNames.push(rename.name.replace(/\s*\([^)]+\)\s*/gi, ''));
          }
        }
      }
      this.systems.push(system);
    });

    // sort systems so that clusters are painted first and appear at the bottom (visually)
    this.systems.sort((a,b) => (b.radiusX + b.radiusY) - (a.radiusX + a.radiusY));

    Logger.info(`Done parsing ${this.systems.length} systems`);
  }

  /**
   * Parses the available nebulae from the workbook's nebulae sheet.
   */
  private async parseNebulae(rowRange: sheets_v4.Schema$ValueRange) {
      Logger.info(`Now parsing nebulae data`);
      this.nebulae = [];

      let nebula: Nebula;
      for(const row of rowRange.values || []) {
          if(!row[0]) {
              continue;
          }
          nebula = {
              name: row[0],
              centerX: parseFloat(row[1].replaceAll(',', '')),
              centerY: parseFloat(row[2].replaceAll(',', '')),
              width: parseFloat(row[3].replaceAll(',', '')),
              height: parseFloat(row[4].replaceAll(',', '')),
              // these fields will be calculated
              x: 0,
              y: 0,
              radiusX: 0,
              radiusY: 0,
              rotation: 0
          };
          nebula.radiusX = nebula.width * .5;
          nebula.radiusY = nebula.height * .5;
          nebula.x = nebula.centerX - nebula.radiusX;
          nebula.y = nebula.centerY - nebula.radiusY;
          this.nebulae.push(nebula);
      }

      Logger.info(`Done parsing ${this.nebulae.length} nebulae`);
  }
}
