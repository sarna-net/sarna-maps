import { BorderSection } from '../types';
import { logger, pointsAreEqual } from '../../../common';
import { reverseEdges } from './utils';
import { EMPTY_FACTION, INDEPENDENT } from '../../constants';

/**
 * Merges border sections so that the largest sections are stitched together as loops.
 * @param sections The border sections (will be modified)
 * @param hierarchyLevelIndex The hierarchy level of the sections to merge
 */
export function mergeBorderSections(sections: Array<BorderSection>, hierarchyLevelIndex: number) {
  // Sort the existing border sections by number of edges so that the largest sections
  // gather up the smaller ones.
  sections.sort((a, b) =>
    a.primaryAffiliation === INDEPENDENT || a.primaryAffiliation === EMPTY_FACTION || (a.affiliation1 === EMPTY_FACTION && a.affiliation2 === INDEPENDENT)
      ? 1
      : b.primaryAffiliation === INDEPENDENT || (b.affiliation1 === EMPTY_FACTION && b.affiliation2 === INDEPENDENT)
      ? -1
      : a.affiliation1 === EMPTY_FACTION || a.affiliation2 === EMPTY_FACTION
      ? 1
      : b.affiliation1 === EMPTY_FACTION || b.affiliation2 === EMPTY_FACTION
      ? -1
      : b.edges.length - a.edges.length,
  );

  for (let i = 0; i < sections.length; i++) {
    let changeMadeForSection = false;

    // for the currently looked at section, find another section that links to it
    // and shares one of its affiliations
    for (let j = i + 1; j < sections.length; j++) {
      // only merge sections that belong to the same parent affiliation
      const iParentAffiliations = [
        sections[i].affiliation1.split(',').slice(0, hierarchyLevelIndex).join(','),
        sections[i].affiliation2.split(',').slice(0, hierarchyLevelIndex).join(','),
      ].sort().join('|');
      const jParentAffiliations = [
        sections[j].affiliation1.split(',').slice(0, hierarchyLevelIndex).join(','),
        sections[j].affiliation2.split(',').slice(0, hierarchyLevelIndex).join(','),
      ].sort().join('|');
      if (iParentAffiliations !== jParentAffiliations) {
        continue;
      }


      // list of affiliations common to both sections
      const commonAffiliations = [sections[i].affiliation1, sections[i].affiliation2].filter(
        (aff) => [sections[j].affiliation1, sections[j].affiliation2].includes(aff)
          // we will not use the "empty" faction affiliation to merge sections
          && aff !== EMPTY_FACTION && aff !== INDEPENDENT,
      );

      //
      if (
        commonAffiliations.length === 0 ||
        (sections[i].primaryAffiliation && !commonAffiliations.includes(sections[i].primaryAffiliation as string)) ||
        (commonAffiliations.length === 1 && commonAffiliations[0] === EMPTY_FACTION)
      ) {
        continue;
      }
      if (!sections[i].primaryAffiliation) {
        sections[i].primaryAffiliation = commonAffiliations[0];
      }
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
        // remove merged section
        sections.splice(j, 1);
        j--;
        changeMadeForSection = true;
      }
    }

    // in case any changes were made to the active section, run the loop for that same
    // section again
    if (changeMadeForSection) {
      i--;
    }
  }
  return sections;
}
