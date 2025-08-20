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

export const logger = {
  debug: (...messages: any) => logSettings.level <= LOGGER_LEVELS.All && console.debug('[DEBUG]', ...messages),
  log: (...messages: any) => logSettings.level <= LOGGER_LEVELS.NoDebug && console.log('[LOG]', ...messages),
  info: (...messages: any) => logSettings.level <= LOGGER_LEVELS.NoLogsOrDebug && console.info('[INFO]', ...messages),
  warn: (...messages: any) => logSettings.level <= LOGGER_LEVELS.WarningsAndErrors && console.warn('[WARNING]', ...messages),
  error: (...messages: any) => logSettings.level <= LOGGER_LEVELS.ErrorsOnly && console.error('[ERROR]', ...messages),
};
