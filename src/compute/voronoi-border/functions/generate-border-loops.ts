import { BorderSection, BorderDelaunayVertex } from '../types';
import { EMPTY_FACTION, INDEPENDENT } from '../../constants';
import { deepCopy, Logger, pointIsLeftOfLine, pointsAreEqual } from '../../../common';
import { reverseEdges } from './utils';
import { BorderEdge } from '../../types';
import { ensureEdgeLoopClockwiseOrder } from './ensure-edge-loop-clockwise-order';

export function generateBorderLoops(sections: Array<BorderSection>, vertices: Array<BorderDelaunayVertex>) {
  const factionLoops: Record<string, Array<BorderSection>> = {
    [EMPTY_FACTION]: [],
    [INDEPENDENT]: [],
  };
  // split sections back up so that they again only cover edges sharing the same two factions
  const smallerSections = splitSections(sections);
  Logger.info(`${sections.length} sections vs. ${smallerSections.length} smaller sections`);
  for (let i = 0; i < smallerSections.length; i++) {
    if (!factionLoops[smallerSections[i].affiliation1]) {
      factionLoops[smallerSections[i].affiliation1] = createFactionLoops(smallerSections[i].affiliation1, smallerSections, vertices);
    } else if (!factionLoops[smallerSections[i].affiliation2]) {
      factionLoops[smallerSections[i].affiliation2] = createFactionLoops(smallerSections[i].affiliation2, smallerSections, vertices);
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

function createFactionLoops(faction: string, sections: Array<BorderSection>, vertices: Array<BorderDelaunayVertex>) {
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
      Logger.warn(
        'Problem during the creation of faction loops: Iteration limit reached',
        faction,
        factionSections.length,
      );
    }
  }
  loops.forEach((loop) => {
    loop.length = loop.edges
      .map((edge) => edge.length)
      .reduce((sum, current) => sum + current);

    loop.edges.forEach((edge, edgeIndex) => {
      // At this point, we should have a current edge and the edge loop that it belongs to.
      // Check if the current edge's node2 point is the leftmost, bottom point in its loop.
      // If it is, mark this edge as the loop's "minimum" edge. This gives us an edge that is
      // guaranteed to be on the loop's convex hull, thus making it a possible pivot point
      // to check the loop's orientation (CW / CCW).
      if (loop.minEdgeIdx < 0 || edge.node2.x  < loop.edges[loop.minEdgeIdx].node2.x) {
        loop.minEdgeIdx = edgeIndex;
      } else if(
        edge.node2.x === loop.edges[loop.minEdgeIdx].node2.x
        && edge.node2.y < loop.edges[loop.minEdgeIdx].node2.y
      ) {
        loop.minEdgeIdx = edgeIndex;
      }
      // find the affiliation to the left and right of the current edge
      if (pointIsLeftOfLine(vertices[edge.vertex1Idx], edge.node1, edge.node2)) {
        edge.leftAffiliation = edge.affiliation1;
        edge.rightAffiliation = edge.affiliation2;
      } else {
        edge.leftAffiliation = edge.affiliation2;
        edge.rightAffiliation = edge.affiliation1;
      }
    });
    ensureEdgeLoopClockwiseOrder(loop);
  });
  loops.sort((a, b) => b.length - a.length);
  return loops;
}
