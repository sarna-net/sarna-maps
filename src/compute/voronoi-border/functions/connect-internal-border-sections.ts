import { BorderSection, VoronoiBorderNode } from '../types';
import { distance, logger } from '../../../common';

/**
 * @param levelIndex
 * @param internalSections (will be modified)
 * @param threeWayNodes
 * @param parentLoops
 */
export function connectInternalBorderSections(
  levelIndex: number,
  internalSections: Array<BorderSection>,
  parentLoops: Array<Record<string, Array<BorderSection>>>
) {
  internalSections.forEach((section) => {
    const parentAffiliationTokens = section.affiliation1.split(',').slice(0, levelIndex);
    // const parentAffiliations: Array<string> = [];
    let node1Changed = false;
    let node2Changed = false;
    for (let parentLevel = 0; parentLevel < levelIndex; parentLevel++) {
      // parentAffiliations.push(parentAffiliationTokens.slice(0, parentLevel).join(','));

      const parentAffiliation = parentAffiliationTokens.slice(0, parentLevel + 1).join(',');
      const outsideAffiliation1 =  Object.keys(section.node1.borderAffiliations).find(
        (aff) => !aff.startsWith(parentAffiliation)
      );
      const outsideAffiliation2 =  Object.keys(section.node2.borderAffiliations).find(
        (aff) => !aff.startsWith(parentAffiliation)
      );

      let minStartDist = Infinity;
      let minEndDist = Infinity;
      let closestParentStartNode: VoronoiBorderNode | undefined = undefined;
      let closestParentEndNode: VoronoiBorderNode | undefined = undefined;
      // find closest parent edge nodes
      ((parentLoops[parentLevel] || {})[parentAffiliation] || []).forEach((parentSection) => {
        parentSection.edges.map((edge) => edge.node1).forEach((parentNode) => {
          const startDist = distance(parentNode, section.node1);
          const endDist = distance(parentNode, section.node2);
          if (startDist < minStartDist) {
            minStartDist = startDist;
            closestParentStartNode = parentNode;
          }
          if (endDist < minEndDist) {
            minEndDist = endDist;
            closestParentEndNode = parentNode;
          }
        });
      });
      if (!node1Changed && outsideAffiliation1 && closestParentStartNode) {
        section.edges[0].node1.x = (closestParentStartNode as VoronoiBorderNode).x;
        section.edges[0].node1.y = (closestParentStartNode as VoronoiBorderNode).y;
        section.node1.x = (closestParentStartNode as VoronoiBorderNode).x;
        section.node1.y = (closestParentStartNode as VoronoiBorderNode).y;
        node1Changed = true;
      }
      if (!node2Changed && outsideAffiliation2 && closestParentEndNode) {
        section.edges[section.edges.length - 1].node2.x = (closestParentEndNode as VoronoiBorderNode).x;
        section.edges[section.edges.length - 1].node2.y = (closestParentEndNode as VoronoiBorderNode).y;
        section.node2.x = (closestParentEndNode as VoronoiBorderNode).x;
        section.node2.y = (closestParentEndNode as VoronoiBorderNode).y;
        node2Changed = true;
      }
      // shortcut if both end nodes have already been modified
      if (node1Changed && node2Changed) {
        break;
      }
    }
    //const parentAffiliation = section.affiliation1.split(',').slice(0, levelIndex).join(',');

    //
    //
    // const outsideAffiliation1 =  Object.keys(section.node1.borderAffiliations).find(
    //   (aff) => !aff.startsWith(parentAffiliation)
    // );
    // if (closestParentStartNode && outsideAffiliation1) {
    //
    // }
    // const outsideAffiliation2 =  Object.keys(section.node2.borderAffiliations).find(
    //   (aff) => !aff.startsWith(parentAffiliation)
    // );
    // if (closestParentEndNode && outsideAffiliation2) {
    //
    // }
  });
}
