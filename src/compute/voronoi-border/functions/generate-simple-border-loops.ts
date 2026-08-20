import { BorderDelaunayVertex, BorderSection } from '../types';
import { EMPTY_FACTION, INDEPENDENT } from '../../constants';
import { buildFactionLoops } from './utils';

export function generateSimpleBorderLoops(sections: Array<BorderSection>, vertices: Array<BorderDelaunayVertex>) {
  const factionLoops: Record<string, Array<BorderSection>> = {
    [EMPTY_FACTION]: [],
    [INDEPENDENT]: [],
  };
  for (let i = 0; i < sections.length; i++) {
    if (!factionLoops[sections[i].affiliation1]) {
      factionLoops[sections[i].affiliation1] = buildFactionLoops(sections[i].affiliation1, sections, vertices);
    } else if (!factionLoops[sections[i].affiliation2]) {
      factionLoops[sections[i].affiliation2] = buildFactionLoops(sections[i].affiliation2, sections, vertices);
    }
  }
  return factionLoops;
}
