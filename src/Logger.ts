import * as winston from 'winston';
import * as path from 'path';

/**
 * Logger singleton.
 * Use Logger.log/info/warn/error functions to create log entries.
 */
export class Logger {

    private static instance?: Logger;
    public static winston: winston.Logger;

    private constructor() {
        // ensure that there is only one instance
        if(Logger.instance) {
            throw new Error('Logger is a singleton object, use getInstance method to retrieve object reference');
        }
        // init
        let logParentDir = '';
        if(process.env.NODE_ENV === 'test') {
            logParentDir = '../test_out';
        }
        Logger.winston = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            //defaultMeta: { service: 'user-service' },
            transports: [
                new winston.transports.File({
                    filename: path.join(__dirname, logParentDir, 'logs', 'error.log'),
                    level: 'error',
                    format: winston.format.simple(),
                    //maxsize: 10000,
                    //maxFiles: 1,
                    options: { flags: 'w' }
                }),
                new winston.transports.File({
                    filename: path.join(__dirname, logParentDir, 'logs', 'all.log'),
                    //maxsize: 50000,
                    //maxFiles: 1,
                    format: winston.format.simple(),
                    options: { flags: 'w' }
                })
            ]
        });
        if(process.env.NODE_ENV !== 'production') {
            winston.add(new winston.transports.Console({
                format: winston.format.simple()
            }));
        }
    }

    public static log(level: string, message: string, ...moreArgs: any[]) {
        Logger.instance || new Logger();
        return Logger.winston.log(level, message, ...moreArgs);
    }

    public static info(message: string, ...moreArgs: any[]) {
        Logger.instance || new Logger();
        return Logger.winston.info(message, ...moreArgs);
    }

    public static warn(message: string, ...moreArgs: any[]) {
        Logger.instance || new Logger();
        return Logger.winston.warn(message, ...moreArgs);
    }

    public static error(message: string, ...moreArgs: any[]) {
        Logger.instance || new Logger();
        return Logger.winston.error(message, ...moreArgs);
    }
}
