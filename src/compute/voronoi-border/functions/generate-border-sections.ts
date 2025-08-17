import { VoronoiBorderEdge, BorderSection } from '../types';
import { deepCopy, pointsAreEqual } from '../../../common';
import { reverseEdges } from './utils';

export function generateBorderSections(borderEdges: Record<string, Array<VoronoiBorderEdge>>) {
  const borderSections: Array<BorderSection> = [];

  Object.keys(borderEdges).forEach((combinedAffiliations) => {
    const originalEdges = borderEdges[combinedAffiliations];
    const [affiliation1, affiliation2] = combinedAffiliations.split('___').sort();

    // begin with each edge forming its own section
    const sections = deepCopy(originalEdges).map((edge, edgeIndex) => ({
      id: `section_${edgeIndex + 1}`,
      edges: [edge],
      isLoop: false,
      affiliation1,
      affiliation2,
      node1: edge.node1,
      node2: edge.node2,
      length: -1,
      minEdgeIdx: -1,
    }  as BorderSection));

    // Loop over the sections and try to connect them, tracking whenever a connection has been made. Run this
    // loop as long as there are still changes going on.
    // TODO There must be a more optimal way of doing this. Sort?
    // -> At least use mergeBorderSections for this
    const ITERATIONS_LIMIT = 10000;
    for (let iterations = 0; iterations < ITERATIONS_LIMIT; iterations++) {
      let changeMade = false;
      for (let i = 0; i < sections.length; i++) {
        for (let j = i + 1; j < sections.length; j++) {
          let merged = false;
          if (pointsAreEqual(sections[i].node1, sections[j].node1)) {
            sections[i].edges.unshift(...reverseEdges(sections[j].edges));
            merged = true;
          } else if (pointsAreEqual(sections[i].node1, sections[j].node2)) {
            sections[i].edges.unshift(...sections[j].edges);
            merged = true;
          } else if (pointsAreEqual(sections[i].node2, sections[j].node1)) {
            sections[i].edges.push(...sections[j].edges);
            merged = true;
          } else if (pointsAreEqual(sections[i].node2, sections[j].node2)) {
            sections[i].edges.push(...reverseEdges(sections[j].edges));
            merged = true;
          }
          if (merged) {
            sections[i].node1 = sections[i].edges[0].node1;
            sections[i].node2 = sections[i].edges[sections[i].edges.length - 1].node2;
            sections[i].isLoop = pointsAreEqual(sections[i].node1, sections[i].node2);
            sections.splice(j, 1);
            j--;
            changeMade = true;
          }
        }
      }
      if (!changeMade) {
        break;
      }
      if (iterations === ITERATIONS_LIMIT - 1) {
        console.warn(`Iterations limit reached while generating border sections for "${combinedAffiliations}". Aborting.`);
      }
    }
    borderSections.push(...sections);
  });
  return borderSections;
}
