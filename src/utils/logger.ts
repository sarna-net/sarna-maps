import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Logger singleton.
 * Use Logger.log/info/warn/error functions to create log entries.
 */
export class Logger {

  private static instance?: Logger;
  public static winnie: winston.Logger;

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
    const logPath = path.join(__dirname, logParentDir, 'logs');
    // in non-production environments, remove log directory and re-create it
    if(process.env.NODE_ENV !== 'production') {
      if (fs.existsSync(logPath)) {
        fs.readdirSync(logPath).forEach(file => {
          fs.unlinkSync(path.join(logPath, file));
        });
        fs.rmdirSync(logPath);
      }
    }
    Logger.winnie = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      //defaultMeta: { service: 'user-service' },
      transports: [
        new winston.transports.File({
          filename: path.join(logPath, 'error.log'),
          level: 'error',
          format: winston.format.simple(),
          maxsize: 100000,
          //maxFiles: 1,
          //options: { flags: 'a' }
        }),
        new winston.transports.File({
          filename: path.join(logPath, 'all.log'),
          maxsize: 100000,
          //maxFiles: 1,
          format: winston.format.simple()
          //options: { flags: 'a' }
        })
      ]
    });
    if(process.env.NODE_ENV !== 'production') {
      Logger.winnie.add(new winston.transports.Console({ format: winston.format.simple() }));
    }
    Logger.info('Logger instance created');
  }

  public static log(message: unknown, ...moreArgs: unknown[]) {
    /*Logger.instance || new Logger();
    return Logger.winnie.log(level, message, ...moreArgs);*/
    console.log(message, ...moreArgs);
  }

  public static info(message: unknown, ...moreArgs: unknown[]) {
    /*Logger.instance || new Logger();
    return Logger.winnie.info(message, ...moreArgs);*/
    console.info(message, ...moreArgs);
  }

  public static warn(message: unknown, ...moreArgs: unknown[]) {
    /*Logger.instance || new Logger();
    return Logger.winnie.warn(message, ...moreArgs);*/
    console.warn(message, ...moreArgs);
  }

  public static error(message: unknown, ...moreArgs: unknown[]) {
    /*Logger.instance || new Logger();
    return Logger.winnie.error(message, ...moreArgs);*/
    console.error(message, ...moreArgs);
  }
}
