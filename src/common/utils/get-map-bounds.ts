import { Era, System } from '../types';
import { extractBorderStateAffiliation } from './extract-border-state-affiliation';

export function getMapBounds(
  era: Era,
  systems: System[],
  factionIds: string[],
  padding: { x: number; y: number }
) {
  const bounds = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
  };
  const lowerCaseFactionIds = factionIds.map((id) => id.toLowerCase());

  const displayedSystems = systems.filter((system) => {
    if (system.eraAffiliations.length <= era.index) {
      return false;
    }
    const factionId = extractBorderStateAffiliation(system.eraAffiliations[era.index]).toLowerCase();
    return lowerCaseFactionIds.includes(factionId);
  });
  console.log('displayedSystems', lowerCaseFactionIds, displayedSystems.length);
  displayedSystems.forEach((system) => {
    bounds.minX = Math.min(bounds.minX, system.x);
    bounds.maxX = Math.max(bounds.maxX, system.x);
    bounds.minY = Math.min(bounds.minY, system.y);
    bounds.maxY = Math.max(bounds.maxY, system.y);
  });
  return {
    minX: bounds.minX - padding.x,
    maxX: bounds.maxX + padding.x,
    minY: bounds.minY - padding.y,
    maxY: bounds.maxY + padding.y,
  };
}
