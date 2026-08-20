import { BorderSection, BorderDelaunayVertex } from '../types';
import { BorderEdge } from '../../types';
import { EMPTY_FACTION, INDEPENDENT } from '../../constants';
import { logger } from '../../../common';
import { buildFactionLoops } from './utils';

export function generateBorderLoops(sections: Array<BorderSection>, vertices: Array<BorderDelaunayVertex>) {
  const factionLoops: Record<string, Array<BorderSection>> = {
    [EMPTY_FACTION]: [],
    [INDEPENDENT]: [],
  };
  // split sections back up so that they again only cover edges sharing the same two factions
  const smallerSections = splitSections(sections);
  logger.debug(`${sections.length} sections vs. ${smallerSections.length} smaller sections`);
  for (let i = 0; i < smallerSections.length; i++) {
    if (!factionLoops[smallerSections[i].affiliation1]) {
      factionLoops[smallerSections[i].affiliation1] = buildFactionLoops(smallerSections[i].affiliation1, smallerSections, vertices);
    } else if (!factionLoops[smallerSections[i].affiliation2]) {
      factionLoops[smallerSections[i].affiliation2] = buildFactionLoops(smallerSections[i].affiliation2, smallerSections, vertices);
    }
  }
  return factionLoops;
}

function splitSections(sections: Array<BorderSection>) {
  const smallerSections: Array<BorderSection> = [];
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    let currentSectionStart = 0;
    let currentAffiliations = '';
    for (let edgeIndex = 0; edgeIndex < section.edges.length; edgeIndex++) {
      const edge = section.edges[edgeIndex];
      if (!currentAffiliations) {
        currentAffiliations = getEdgeAffiliations(edge);
      }
      if (
        edgeIndex === section.edges.length - 1 ||
        currentAffiliations !== getEdgeAffiliations(section.edges[edgeIndex + 1])
      ) {
        smallerSections.push({
          id: section.id + '-' + currentSectionStart,
          affiliation1: edge.affiliation1,
          affiliation2: edge.affiliation2,
          node1: section.edges[currentSectionStart].node1,
          node2: edge.node2,
          isLoop: section.edges[currentSectionStart].node1.id === edge.node2.id,
          length: -1,
          minEdgeIdx: -1,
          edges: section.edges.slice(currentSectionStart, edgeIndex + 1),
        });
        currentSectionStart = edgeIndex + 1;
        currentAffiliations = '';
      }
    }
  }
  return smallerSections;
}

function getEdgeAffiliations(edge: BorderEdge) {
  return [edge.affiliation1, edge.affiliation2].sort().join('__');
}
