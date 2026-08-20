import * as fs from 'fs';
import * as path from 'path';

export enum LOGGER_LEVELS {
  All = 0,
  NoDebug = 1,
  NoLogsOrDebug = 2,
  WarningsAndErrors = 3,
  ErrorsOnly = 4
}

export const logSettings = {
  level: LOGGER_LEVELS.All
};

const OUTPUT_PATH = path.resolve(process.cwd(), 'warning-error-log.txt');

function ensureLogFile(): void {
  try {
    if (!fs.existsSync(OUTPUT_PATH)) {
      fs.writeFileSync(OUTPUT_PATH, '', { encoding: 'utf-8' });
    }
  } catch (err) {
    console.error('[LOGGER ERROR] Failed to ensure log file:', String(err));
  }
}

function appendToFile(line: string): void {
  try {
    ensureLogFile();
    fs.appendFileSync(OUTPUT_PATH, line + '\n', { encoding: 'utf-8' });
  } catch (err) {
    console.error('[LOGGER ERROR] Failed to write log:', String(err));
  }
}

export const logger = {
  debug: (...messages: any[]) => logSettings.level <= LOGGER_LEVELS.All && console.debug('[DEBUG]', ...messages),
  log: (...messages: any[]) => logSettings.level <= LOGGER_LEVELS.NoDebug && console.log('[LOG]', ...messages),
  info: (...messages: any[]) => logSettings.level <= LOGGER_LEVELS.NoLogsOrDebug && console.info('[INFO]', ...messages),
  warn: (fileName: string, ...messages: any[]) => {
    const prefix = fileName ? `[${fileName}] ` : '';
    const fullMessage = `[WARNING] ${prefix}` + messages.map(m => String(m)).join(' ');
    if (logSettings.level <= LOGGER_LEVELS.WarningsAndErrors) {
      console.warn(fullMessage);
    }
    appendToFile(fullMessage);
  },
  error: (fileName: string, ...messages: any[]) => {
    const prefix = fileName ? `[${fileName}] ` : '';
    const fullMessage = `[ERROR] ${prefix}` + messages.map(m => String(m)).join(' ');
    if (logSettings.level <= LOGGER_LEVELS.ErrorsOnly) {
      console.error(fullMessage);
    }
    appendToFile(fullMessage);
  },
};