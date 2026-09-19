import fs from 'fs';
import yaml from 'yaml';
import { AppError, logger } from '../../common';

/**
 * Attempts to read and parse a yaml file.
 */
export function readAndParseYamlFile<T>(filePath: string, contentDescription = 'YAML') {
  let fileContent: string;
  try {
    fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
  } catch (err: any) {
    logger.error(`Could not read ${contentDescription} file: `, (err as AppError)?.message);
    return null;
  }
  try {
    return yaml.parse(fileContent) as T;
  } catch (err: any) {
    logger.error(`Could not parse ${contentDescription}: `, err as AppError);
    return null;
  }
}
