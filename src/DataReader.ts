import {Logger} from './Logger';
import {sheets_v4} from 'googleapis';
import {Era, Faction, Nebula, System} from './Types';

/**
 * An instance of this class reads the eras, factions, planetary systems and
 * nebulae from the SUCKit or any other Google Sheets workbook, provided that
 * workbook adheres to the same format as the SUCKit, and is readable by anyone.
 */
export class DataReader {

    private static GOOGLE_API_KEY = 'AIzaSyBMsqTAmOdCNy0EBF3-1qblt75qnEZMyIE';

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
                `${this.systemsSheetName}!A2:AZ4000`,
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
            while(faction.color.length < 7) {
                faction.color += '0';
            }
            if(faction.id === 'TC') {
                faction.color = '#B73C26';
            }
            this.factions.set(faction.id, faction);
        }

        Logger.info(`Done parsing ${this.factions.size} factions`);
    }

    private async parseSystems(rowRange: sheets_v4.Schema$ValueRange) {
        Logger.info(`Now parsing system data`);
        this.systems = [];

        Logger.info(`Done parsing ${this.systems.length}`);
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
