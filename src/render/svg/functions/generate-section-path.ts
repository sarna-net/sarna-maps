import { BorderEdgeLoop, BorderSection } from '../../../compute';

export function generateSectionPath(section: BorderSection | BorderEdgeLoop, renderCurves: boolean) {
  let d = '';
  section.edges.forEach((edge, edgeIndex) => {
    if (edgeIndex === 0) {
      d += ` M${edge.node1.x.toFixed(2)},${(-edge.node1.y).toFixed(2)}`;
    }
    if (!renderCurves || (!edge.n1c2 && !edge.n2c1)) {
      d += ` L${edge.node2.x.toFixed(2)},${(-edge.node2.y).toFixed(2)}`;
    } else if (edge.n1c2 && !edge.n2c1) {
      d += ` Q${edge.n1c2.x.toFixed(2)},${(-edge.n1c2.y).toFixed(2)}`
      d += ` ${edge.node2.x.toFixed(2)},${(-edge.node2.y).toFixed(2)}`;
    } else if (!edge.n1c2 && edge.n2c1) {
      d += ` Q${edge.n2c1.x.toFixed(2)},${(-edge.n2c1.y).toFixed(2)}`
      d += ` ${edge.node2.x.toFixed(2)},${(-edge.node2.y).toFixed(2)}`;
    } else if (edge.n1c2 && edge.n2c1) {
      d += ` C${edge.n1c2.x.toFixed(2)},${(-edge.n1c2.y).toFixed(2)}`;
      d += ` ${edge.n2c1.x.toFixed(2)},${(-edge.n2c1.y).toFixed(2)}`;
      d += ` ${edge.node2.x.toFixed(2)},${(-edge.node2.y).toFixed(2)}`;
    }
  });
  return d;
}
