import { Era, System } from '../../common';
import { traceFaction } from '../../common/utils/faction-traversal-logger';

const FILE_NAME = 'parse-single-system.ts';

export interface SystemRow {
  id: string;
  name: string;
  alternateNames: string;
  x: number;
  y: number;
  eraAffiliations: Array<string>;
  size: [number, number, number];
}

interface SystemRename {
  year: number;
  name: string;
}

/**
 * Utility function that takes the "raw" content of a spreadsheet row and turns it into a system object
 */
export function parseSingleSystem(id: string, row: SystemRow, eras: Array<Era>): System {

  traceFaction(FILE_NAME, 'INPUT SYSTEM ID', id);
  //traceFaction(FILE_NAME, 'RAW eraAffiliations', JSON.stringify(row.eraAffiliations));

  // Ensure that scale and rotation values exist
  if (!row.size || (row.size as Array<number>).length === 0) {
    traceFaction(FILE_NAME, 'DEFAULT SIZE APPLIED', id);
    row.size = [1, 1, 0];
  }

  // --- Alternate Names Parsing ---
  const renames: Array<SystemRename> = [];

  row.alternateNames.split(/\s*[,/]\s*/).forEach((nameChange) => {
    const regexResult = nameChange.match(/(.*)\s*\((\d+).*\)/i);

    if (!regexResult) {
      return;
    }

    const renameObj = {
      year: parseInt(regexResult[2], 10),
      name: regexResult[1].trim()
    };

    traceFaction(
      FILE_NAME,
      'RENAME PARSED',
      `year=${renameObj.year} name="${renameObj.name}"`
    );

    renames.push(renameObj);
  });

  renames.sort((a, b) => a.year - b.year);

  traceFaction(
    FILE_NAME,
    'SORTED RENAMES',
    JSON.stringify(renames)
  );

  // --- Era Processing ---
  const eraNames: Array<string> = [];
  const eraAffiliations: Array<string> = [];
  const eraCapitalLevels: Array<number> = [];

  eras.forEach((era, eraIndex) => {

    const affiliation = row.eraAffiliations[eraIndex];

    traceFaction(
      FILE_NAME,
      `ERA ${eraIndex} RAW AFFILIATION`,
      `year=${era.year} value="${affiliation}"`
    );

    eraAffiliations.push(affiliation);

    // --- Capital detection ---
    if (affiliation.match(/faction capital/gi)) {
      eraCapitalLevels.push(1);
    } else if (affiliation.match(/major capital/gi)) {
      eraCapitalLevels.push(2);
    } else if (affiliation.match(/minor capital/gi)) {
      eraCapitalLevels.push(3);
    } else {
      eraCapitalLevels.push(0);
    }

    traceFaction(
      FILE_NAME,
      `ERA ${eraIndex} CAPITAL LEVEL`,
      `value=${eraCapitalLevels[eraCapitalLevels.length - 1]}`
    );

    // --- Name resolution ---
    eraNames.push(row.name.replace(/\s*\([^)]+\)\s*/gi, ''));

    renames.forEach((rename) => {
      if (era.year >= rename.year) {
        eraNames.pop();
        eraNames.push(rename.name.replace(/\s*\([^)]+\)\s*/gi, ''));

        traceFaction(
          FILE_NAME,
          `ERA ${eraIndex} NAME OVERRIDE`,
          `year=${rename.year} name="${rename.name}"`
        );
      }
    });

    traceFaction(
      FILE_NAME,
      `ERA ${eraIndex} FINAL NAME`,
      eraNames[eraNames.length - 1]
    );
  });
/**
  traceFaction(
    FILE_NAME,
    'FINAL eraAffiliations',
    JSON.stringify(eraAffiliations)
  );
*/
  return {
    id,
    name: row.name,
    fullName: row.name,
    x: row.x,
    y: row.y,
    radiusX: row.size[0],
    radiusY: row.size[1],
    rotation: row.size[2],
    isCluster: row.size[0] !== 1.0 || row.size[1] !== 1.0,
    eraAffiliations,
    eraCapitalLevels,
    eraNames,
  };
}