import {Logger} from './Logger';
import {sheets_v4} from 'googleapis';
import {Era, Faction, Nebula, System} from './Entities';

/**
 * An instance of this class reads the eras, factions, planetary systems and
 * nebulae from the SUCKit or any other Google Sheets workbook, provided that
 * workbook adheres to the same format as the SUCKit, and is readable by anyone.
 */
export class DataReader {

    private static GOOGLE_API_KEY = 'AIzaSyBMsqTAmOdCNy0EBF3-1qblt75qnEZMyIE';

    private static SYSTEMS_SHEET_FIRST_ERA_COLUMN = 8;

    private spreadsheetId: string;
    private sheetsClient: sheets_v4.Sheets;

    private columnsSheetName: string = '';
    private factionsSheetName: string = '';
    private systemsSheetName: string = '';
    private nebulaeSheetName: string = '';

    private eras: Era[] = [];
    private factions: Map<string,Faction>;
    private systems: System[] = [];
    private nebulae: Nebula[] = [];

    constructor(spreadsheetId: string) {
        this.spreadsheetId = spreadsheetId;
        this.sheetsClient = new sheets_v4.Sheets({
            auth: DataReader.GOOGLE_API_KEY
        });
        this.factions = new Map();
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
        if(spreadsheet.sheets.length !== 6) {
            throw new Error(`Cannot read data - Spreadsheet has ${spreadsheet.sheets.length} sheets instead of the expected 6.`);
        }

        this.columnsSheetName = (spreadsheet.sheets[1].properties||{}).title || '';
        this.factionsSheetName = (spreadsheet.sheets[3].properties||{}).title || '';
        this.systemsSheetName = (spreadsheet.sheets[2].properties||{}).title || '';
        this.nebulaeSheetName = (spreadsheet.sheets[4].properties||{}).title || '';

        const dataRanges = await this.readDataRanges();
        await this.parseEras(dataRanges[0]);
        await this.parseFactions(dataRanges[1]);
        await this.parseSystems(dataRanges[2]);
        await this.parseNebulae(dataRanges[3]);
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

        for(let row of rowRange.values || []) {
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
        this.factions.clear();

        let faction: Faction;
        for(let row of rowRange.values || []) {
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
            this.factions.set(faction.id, faction);
        }

        Logger.info(`Done parsing ${this.factions.size} factions`);
    }

    /**
     * Parses the available systems and clusters from the workbook's systems sheet.
     */
    private async parseSystems(rowRange: sheets_v4.Schema$ValueRange) {
        Logger.info(`Now parsing system data`);
        this.systems = [];

        let system: System,
            alternateNames: string,
            renames: {year: number, name: string}[],
            size: string;

        for(let row of rowRange.values || []) {
            system = {
                name: row[1],
                fullName: row[1],
                x: parseFloat(row[3]),
                y: parseFloat(row[4]),
                // final values for these fields are calculated later on:
                radiusX: 1,
                radiusY: 1,
                rotation: 0,
                isCluster: false,
                affiliations: [],
                capitalLevels: [],
                names: []
            };
            alternateNames = row[2];
            size = row[5];

            // skip systems without name or coordinates
            if(!system.name || system.x === undefined || isNaN(system.x) || system.y === undefined || isNaN(system.y)) {
                continue;
            }

            // Alternate names:
            // relevant alternate names occur as "Tiverton (3022+)"
            // or "Chadan (2890+), Chandan (3022+)" or "Chadan (2890+) / Chandan (3022+)"
            renames = [];
            let alternateNamesArr = alternateNames.split(/\s*[,\/]\s*/);
            // translate the resulting strings into objects and remember them as renames
            for(let nameChange of alternateNamesArr) {
                // disregard any alternate names without an attached year in parentheses
                let regexResult = nameChange.match(/(.*)\s*\((\d+).*\)/i);
                if(!regexResult) {
                    continue;
                }
                renames.push({
                    year: parseInt(regexResult[2], 10),
                    name: regexResult[1].trim()
                });
            }
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
                affiliation = row[DataReader.SYSTEMS_SHEET_FIRST_ERA_COLUMN + eraIndex] || '';
                system.affiliations.push(affiliation);
                // determine whether the system is any sort of capital in this era
                if(affiliation.match(/faction capital/gi)) {
                    system.capitalLevels.push(1);
                } else if(affiliation.match(/major capital/gi)) {
                    system.capitalLevels.push(2);
                } else if(affiliation.match(/minor capital/gi)) {
                    system.capitalLevels.push(3);
                } else {
                    system.capitalLevels.push(0);
                }
                // determine the system's name in this era
                // default is the regular name
                system.names.push(system.name.replace(/\s*\([^\)]+\)\s*/gi, ''));
                for(let rename of renames) {
                    if(era.year >= rename.year) {
                        system.names.pop();
                        system.names.push(rename.name.replace(/\s*\([^\)]+\)\s*/gi, ''));
                    }
                }
            }

            this.systems.push(system);
        }

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
        for(let row of rowRange.values || []) {
            if(!row[0]) {
                continue;
            }
            nebula = {
                name: row[0],
                centerX: parseFloat(row[1]),
                centerY: parseFloat(row[2]),
                width: parseFloat(row[3]),
                height: parseFloat(row[4]),
                // these fields will be calculated
                x: 0,
                y: 0,
                radiusX: 0,
                radiusY: 0
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
