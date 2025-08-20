import fs from 'fs';
import yaml from 'yaml';
import { logger } from '../../common';

/**
 * Attempts to read and parse a yaml file.
 */
export function readAndParseYamlFile(filePath: string, contentDescription = 'YAML') {
  let fileContent: string;
  try {
    fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
  } catch (err) {
    logger.error(`Could not read ${contentDescription} file: `, err.message);
    return null;
  }
  try {
    return yaml.parse(fileContent);
  } catch (err) {
    logger.error(`Could not parse ${contentDescription}: `, err);
    return null;
  }
}
