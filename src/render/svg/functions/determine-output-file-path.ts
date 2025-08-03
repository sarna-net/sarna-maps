import path from 'path';
import { Era, System } from '../../../common';
import sanitize from 'sanitize-filename';

export function determineOutputFilePath(
  directory: string,
  fileNamePattern: string,
  era: Era,
  system?: System,
  systemIndex?: number,
) {
  // - {{SYSTEMINDEX}} The system's 0-based index (only if we are iterating by system)
  // - {{SYSTEMID}} The system's numeric ID (only if we are iterating by system)
  // - {{SYSTEMNAME}} The system's name (only if we are iterating by system)
  // - {{ERAINDEX}} The map era's 0-based index
  // - {{ERAID}} The map era's ID
  // - {{ERAYEAR}} The map era's year
  // - {{ERANAME}} The map era's full name
  const fileName = fileNamePattern
    .replaceAll('{{SYSTEMINDEX}}', String(systemIndex) || '')
    .replaceAll('{{SYSTEMID}}', system?.id || '')
    .replaceAll('{{SYSTEMNAME}}', system?.name || '')
    .replaceAll('{{ERAINDEX}}', String(era.index) || '')
    .replaceAll('{{ERAID}}', String(era.index) || '')
    .replaceAll('{{ERAYEAR}}', String(era.year) || '')
    .replaceAll('{{ERANAME}}', era.name || '');
  return path.join(directory, '/', sanitize(fileName)).normalize();
}
