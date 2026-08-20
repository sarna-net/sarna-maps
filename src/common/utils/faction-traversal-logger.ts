import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { logger } from './logger';

/**
 * Always resolve relative to project root (execution root)
 */
const OUTPUT_PATH = path.resolve(process.cwd(), 'faction-traversal-log.txt');

/**
 * Config file path
 */
const CONFIG_PATH = path.resolve(process.cwd(), 'config', 'global', 'faction-traversal.config.yaml');

/**
 * Log frequency options
 */
export type LogFrequency = 'all' | 'every-fifth' | 'every-tenth';

/**
 * Logging level options
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Config file structure
 */
export interface FactionTraversalConfig {
  enabled: boolean;
  level: LogLevel;
  logFrequency: LogFrequency;
  pattern: string;
  excludeFiles: string[];
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: FactionTraversalConfig = {
  enabled: true,
  level: 'debug',
  logFrequency: 'all',
  pattern: '',
  excludeFiles: [],
};

/**
 * Module-level config for faction traversal logging.
 * Loaded from YAML config file only - no programmatic overrides.
 */
let _config: FactionTraversalConfig = { ...DEFAULT_CONFIG };
let _traceCounter = 0;
let _configLoaded = false;

/**
 * Load configuration from YAML file only.
 * This is the ONLY method of configuring the faction traversal logger.
 */
function loadConfig(): void {
  if (_configLoaded) {
    return;
  }

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const fileContent = fs.readFileSync(CONFIG_PATH, { encoding: 'utf8' });
      const parsed = yaml.parse(fileContent) as Partial<FactionTraversalConfig>;

      _config = {
        enabled: parsed.enabled ?? DEFAULT_CONFIG.enabled,
        level: parsed.level ?? DEFAULT_CONFIG.level,
        logFrequency: parsed.logFrequency ?? DEFAULT_CONFIG.logFrequency,
        pattern: parsed.pattern ?? DEFAULT_CONFIG.pattern,
        excludeFiles: parsed.excludeFiles ?? DEFAULT_CONFIG.excludeFiles,
      };

      logger.info('faction-traversal-logger.ts', `Loaded config from ${CONFIG_PATH}`);
    } else {
      logger.info('faction-traversal-logger.ts', `Config file not found at ${CONFIG_PATH}, using defaults`);
      _config = { ...DEFAULT_CONFIG };
    }
  } catch (err) {
    logger.warn('faction-traversal-logger.ts', `Failed to load config: ${String(err)}, using defaults`);
    _config = { ...DEFAULT_CONFIG };
  }

  _configLoaded = true;
}

/**
 * Get current configuration (for debugging purposes)
 */
export function getFactionTracingConfig(): FactionTraversalConfig {
  loadConfig();
  return { ..._config };
}

/**
 * Ensures log file exists (atomic-safe)
 */
function ensureLogFile(): void {
  try {
    if (!fs.existsSync(OUTPUT_PATH)) {
      fs.writeFileSync(OUTPUT_PATH, '', { encoding: 'utf-8' });
    }
  } catch (err) {
    logger.error('faction-traversal-logger.ts', `Failed to ensure log file: ${String(err)}`);
  }
}

/**
 * Append line to file (synchronous + safe)
 */
function appendToFile(line: string): void {
  try {
    ensureLogFile();
    fs.appendFileSync(OUTPUT_PATH, line + '\n', { encoding: 'utf-8' });
  } catch (err) {
    logger.error('faction-traversal-logger.ts', `Failed to write log: ${String(err)}`);
  }
}

/**
 * Normalize faction value (defensive)
 */
function normalizeFaction(value: string): string {
  return value.trim();
}

/**
 * Should this file be excluded from logging?
 */
function isFileExcluded(fileName: string): boolean {
  return _config.excludeFiles.some(excluded =>
    fileName.includes(excluded)
  );
}

/**
 * Main tracing function
 * Configuration is loaded from config/global/faction-traversal.config.yaml ONLY
 */
export function traceFaction(
  file: string,
  stage: string,
  factionValue: unknown,
): void {
  loadConfig();

  if (!_config.enabled) {
    return;
  }

  if (isFileExcluded(file)) {
    return;
  }

  if (typeof factionValue !== 'string') {
    return;
  }

  const normalized = normalizeFaction(factionValue);

  // Check log frequency filter
  if (_config.logFrequency === 'every-fifth') {
    _traceCounter++;
    if (_traceCounter % 5 !== 0) {
      return;
    }
  } else if (_config.logFrequency === 'every-tenth') {
    _traceCounter++;
    if (_traceCounter % 10 !== 0) {
      return;
    }
  }

  // When pattern is set and non-empty, only log if the value matches the target pattern
  // Empty or whitespace-only pattern means log everything
  const patternValue = _config.pattern?.trim();
  if (patternValue) {
    const regex = new RegExp(patternValue);
    if (!regex.test(normalized)) {
      return;
    }
  }

  const timestamp = new Date().toISOString();

  const message =
    `[FACTION TRACE] ` +
    `time=${timestamp} ` +
    `file=${file} ` +
    `stage=${stage} ` +
    `value=${normalized}`;

  /**
   * Log to both sinks when we reach here
   */
  if (_config.level === 'debug' || _config.level === 'info') {
    logger.info(message);
  } else if (_config.level === 'warn') {
    logger.warn('faction-traversal', message);
  } else if (_config.level === 'error') {
    logger.error('faction-traversal', message);
  }

  appendToFile(message);
}

/**
 * Reset config state (for testing purposes only)
 * @internal
 */
export function _resetConfigForTesting(): void {
  _configLoaded = false;
  _config = { ...DEFAULT_CONFIG };
  _traceCounter = 0;
}