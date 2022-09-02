import { Logger } from './utils';
import { SuckitReader } from './mapgen';
import { SvgWriter } from './writer/write-svg-map';

/**
 * Application singleton. Call App.run() to start.
 * Use App.logger.log/info/warn/error functions to create log entries.
 */
export class App {

    private static instance?: App;

    private constructor() {
        // make sure that there is only one instance
        if(App.instance) {
            throw new Error('App is a singleton object, use getInstance method to retrieve object reference');
        }
        // instantiate
    }

    /**
     * Initializes the app. Emits a warning message if app is already initialized.
     */
    private static init() {
        if(!App.instance) {
            App.instance = new App();
        } else {
            Logger.warn('App instance already exists');
        }
        Logger.info('App initialized');
    }

    /**
     * Runs the app.
     *
     * @returns The application
     */
    public static async run() {
        App.init();
        Logger.info('App running');
        //const dataReader = new DataReader('1NOqCZxVN8KvdkAbefginjvAuRrRCqrt3ihQh11inr60');
        // const dataReader = new SuckitReader('1x9bvFqSb4_or8JbvGj2LnezGkChWxEzRPf5FXvjonHE');
        // const { eras, factions, systems, nebulae } = await dataReader.readDataFromSpreadsheet();
        // convert systems into voronoi nodes
        // const delaunayVertices = systems.map((system) => {
        //     return {
        //         x: system.x,
        //         y: system.y,
        //         color: system.eraAffiliations[15],
        //         adjacentTriIndices: []
        //     };
        // });
        // const borderLoops = VoronoiBorder.calculateBorders(delaunayVertices);
        // SvgWriter.writeSvgMap(factions, borderLoops, {
        //     name: 'test',
        //     dimensions: { width: 100, height: 100 },
        //     viewRect: {
        //         anchor: { x: -100, y: -100 },
        //         dimensions: { width: 200, height: 200 }
        //     }
        // });
    }
}
