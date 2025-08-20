import { BorderSection } from '../types';
import { EMPTY_FACTION, INDEPENDENT } from '../../constants';
import { deepCopy, logger, pointsAreEqual } from '../../../common';
import { reverseEdges } from './utils';

export function generateSimpleBorderLoops(sections: Array<BorderSection>) {
  const factionLoops: Record<string, Array<BorderSection>> = {
    [EMPTY_FACTION]: [],
    [INDEPENDENT]: [],
  };
  for (let i = 0; i < sections.length; i++) {
    if (!factionLoops[sections[i].affiliation1]) {
      factionLoops[sections[i].affiliation1] = createFactionLoops(sections[i].affiliation1, sections);
    } else if (!factionLoops[sections[i].affiliation2]) {
      factionLoops[sections[i].affiliation2] = createFactionLoops(sections[i].affiliation2, sections);
    }
  }
  return factionLoops;
}

function createFactionLoops(faction: string, sections: Array<BorderSection>) {
  // search sections for only this faction
  const factionSections = deepCopy(sections).filter(
    (section) => section.affiliation1 === faction || section.affiliation2 === faction,
  );
  // patch sections together to create loops
  const MAX_ITERATIONS = 10000;
  const loops: Array<BorderSection> = [];
  for (let iterations = 0; factionSections.length > 0 && iterations < MAX_ITERATIONS; iterations++) {
    if (factionSections[0].isLoop) {
      // we've got a loop already - put in the loops array and start a new one
      loops.push(factionSections[0]);
      factionSections.splice(0, 1)
      continue;
    }
    for (let j = 1; j < factionSections.length; j++) {
      let merged = false;
      if (pointsAreEqual(factionSections[0].node1, factionSections[j].node1)) {
        factionSections[0].edges.unshift(...reverseEdges(factionSections[j].edges));
        merged = true;
      } else if (pointsAreEqual(factionSections[0].node1, factionSections[j].node2)) {
        factionSections[0].edges.unshift(...factionSections[j].edges);
        merged = true;
      } else if (pointsAreEqual(factionSections[0].node2, factionSections[j].node1)) {
        factionSections[0].edges.push(...factionSections[j].edges);
        merged = true;
      } else if (pointsAreEqual(factionSections[0].node2, factionSections[j].node2)) {
        factionSections[0].edges.push(...reverseEdges(factionSections[j].edges));
        merged = true;
      }
      if (merged) {
        factionSections[0].node1 = factionSections[0].edges[0].node1;
        factionSections[0].node2 = factionSections[0].edges[factionSections[0].edges.length - 1].node2;
        factionSections[0].isLoop = pointsAreEqual(factionSections[0].node1, factionSections[0].node2);
        // remove merged section
        factionSections.splice(j, 1);
        j--;
        // if we have created a loop, put in the loops array and start a new one
        if (factionSections[0].isLoop) {
          loops.push(factionSections[0]);
          factionSections.splice(0, 1)
          j = 0;
        }
      }
    }
    if (iterations >= MAX_ITERATIONS - 1) {
      logger.warn(
        'Problem during the creation of simple faction loops: Iteration limit reached',
        faction,
        factionSections.length,
      );
      // logger.debug(factionSections[0].edges[0], factionSections[0].edges[1] );
    }
  }
  loops.forEach(
    (section) => section.length = section.edges
      .map((edge) => edge.length)
      .reduce((sum, current) => sum + current));
  loops.sort((a, b) => b.length - a.length);
  return loops;
}
