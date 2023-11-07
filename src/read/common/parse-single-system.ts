import { Era, System } from '../../common';

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
  // Ensure that scale and rotation values exist
  if(!row.size || (row.size as Array<number>).length === 0) {
    row.size = [1, 1, 0];
  }

  // Alternate names:
  // relevant alternate names occur as "Tiverton (3022+)"
  // or "Chadan (2890+), Chandan (3022+)" or "Chadan (2890+) / Chandan (3022+)"
  const renames: Array<SystemRename> = [];
  // translate the resulting strings into objects and remember them as renames
  row.alternateNames.split(/\s*[,/]\s*/).forEach((nameChange) => {
    // disregard any alternate names without an attached year in parentheses
    const regexResult = nameChange.match(/(.*)\s*\((\d+).*\)/i);
    if(!regexResult) {
      return;
    }
    renames.push({
      year: parseInt(regexResult[2], 10),
      name: regexResult[1].trim()
    });
  });
  // sort renames by year
  renames.sort((a,b) => a.year - b.year);

  // era affiliations, capital system levels and era-specific names
  const eraNames: Array<string> = [];
  const eraAffiliations: Array<string> = [];
  const eraCapitalLevels: Array<number> = [];
  eras.forEach((era, eraIndex) => {
    const affiliation = row.eraAffiliations[eraIndex];
    eraAffiliations.push(affiliation);
    // determine whether the system is any sort of capital in this era
    if (affiliation.match(/faction capital/gi)) {
      eraCapitalLevels.push(1);
    } else if (affiliation.match(/major capital/gi)) {
      eraCapitalLevels.push(2);
    } else if (affiliation.match(/minor capital/gi)) {
      eraCapitalLevels.push(3);
    } else {
      eraCapitalLevels.push(0);
    }
    // determine the system's name in this era
    // default is the regular name
    eraNames.push(row.name.replace(/\s*\([^)]+\)\s*/gi, ''));
    renames.forEach((rename) => {
      if (era.year >= rename.year) {
        eraNames.pop();
        eraNames.push(rename.name.replace(/\s*\([^)]+\)\s*/gi, ''));
      }
    });
  });
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
  }
}
