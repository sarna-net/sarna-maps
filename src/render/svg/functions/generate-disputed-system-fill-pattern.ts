import { Faction, logger, Point2d, pointOnUnitCircleByPercentValue } from '../../../common';

export function generateDisputedSystemFillPattern(factionKey: string, factions: Record<string, Faction>, prefix = '') {
  const factionKeys = factionKey.replace(/^D-/i, '').split('-');
  if (factionKeys.length < 2) {
    logger.warn(`Cannot create disputed system fill pattern: Need at least two factions in key "${factionKey}"`);
    return '';
  }
  const paths: Array<string> = [];
  let faction: Faction;
  let currentPercentage = 0;
  let startPoint: Point2d;
  let endPoint: Point2d;
  const percentageForEachSlice = 1 / factionKeys.length;

  for (let i = 0; i < factionKeys.length; i++) {
    faction = factions[factionKeys[i]];
    startPoint = pointOnUnitCircleByPercentValue(currentPercentage);
    currentPercentage += percentageForEachSlice;
    endPoint = pointOnUnitCircleByPercentValue(currentPercentage);
    paths.push(`<path d="`+
      `M${startPoint.x},${startPoint.y} ` +
      `A1,1,0,0,1,${endPoint.x},${endPoint.y} ` +
      `L0,0" ` +
      `style="fill:${faction.color || '#000'}; stroke-width: 0;" />`);
  }
  return `<pattern id="${prefix}system-fill-${factionKey}" width="1" height="1" viewBox="-1 -1 2 2">` +
    `<g style="transform:rotate(-90deg)">${paths.join('')}</g></pattern>`;
}
