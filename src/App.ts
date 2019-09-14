import * as winston from 'winston';
import * as path from 'path';

/**
 * Application singleton. Call App.run() to start.
 * Use App.logger.log/info/warn/error functions to create log entries.
 */
export class App {

    private static instance?: App;
    public static log: winston.Logger;

    private constructor() {
        // ensure that there is only one instance
        if(App.instance) {
            throw new Error('App is a singleton object, use getInstance method to retrieve object reference');
        }
        // init
        App.log = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            //defaultMeta: { service: 'user-service' },
            transports: [
                new winston.transports.File({
                    filename: path.join(__dirname, 'logs/error.log'),
                    level: 'error',
                    format: winston.format.simple(),
                    //maxsize: 10000,
                    //maxFiles: 1,
                    options: { flags: 'w' }
                }),
                new winston.transports.File({
                    filename: path.join(__dirname, 'logs/all.log'),
                    //maxsize: 50000,
                    //maxFiles: 1,
                    format: winston.format.simple(),
                    options: { flags: 'w' }
                })
            ]
        });

        if(process.env.NODE_ENV !== 'production') {
            App.log.add(new winston.transports.Console({
                format: winston.format.simple()
            }));
        }
    }

    /**
     * Initializes the app. Emits a warning message if app is already initialized.
     *
     * @returns The initialized app
     */
    public static init() {
        if(!App.instance) {
            App.instance = new App();
        } else {
            App.log.warn('App instance already exists');
        }
        return App.instance;
    }

    /**
     * Runs the app.
     */
    public static run() {
        App.init();
        App.log.info('hallo');
        App.log.error('test');
    }
}
