import { BorderSection } from '../types';
import { edgeLength } from '../../../common';

/**
 * (Re-)calculates all edge lengths within a border section and sets the edge and section length values
 *
 * @param section The border edge section
 */
export function calculateSectionLength(section: BorderSection) {
  section.length = 0;
  section.edges.forEach((edge) => {
    edge.length = edgeLength({
      p1: edge.node1,
      p2: edge.node2,
      p1c2: edge.n1c2,
      p2c1: edge.n2c1,
    });
    section.length += edge.length;
  });
}
