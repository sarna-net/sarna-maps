import { Faction } from '../../common';
import { BorderEdgeLoop } from '../voronoi-border';
import { placeLabelForFaction } from './place-label-for-faction';
import { FactionLabel } from '../types';

/**
 * Places a faction label for each faction.
 *
 * @param factions List of all factions
 * @param edgeLoops All factions' border edge loops
 */
export async function placeAreaLabels(
  factions: Array<Faction>,
  edgeLoops?: Record<string, Array<BorderEdgeLoop>>,
) {
  const factionPaths: Array<FactionLabel> = [];
  for (const faction of factions) {
    if (!edgeLoops || !edgeLoops[faction.id] || edgeLoops[faction.id].length === 0) {
      continue;
    }
    const { labelPath, labelTokens, labelPathLength } = await placeLabelForFaction(faction, edgeLoops[faction.id]);
    factionPaths.push({
      id: faction.id,
      color: faction.color,
      labelPath,
      labelTokens,
      labelPathLength,
    });
  }
  return factionPaths;
}
