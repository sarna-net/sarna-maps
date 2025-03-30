import { LabelGraphNode } from '../types';
import { distance } from '../../../common';

export function removeShortEdges(nodes: Array<LabelGraphNode>, threshold = 30) {
  for (let i = 1; i < nodes.length - 1; i++) {
    if (distance(nodes[i], nodes[i + 1]) <= threshold) {
      nodes[i].x = (nodes[i].x + nodes[i + 1].x) * 0.5;
      nodes[i].y = (nodes[i].y + nodes[i + 1].y) * 0.5;
      nodes.splice(i + 1, 1);
    }
  }
  return nodes;
}
