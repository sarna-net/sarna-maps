import { BorderSection, BorderDelaunayVertex, VoronoiBorderEdge, VoronoiBorderNode } from '../../types';
import { normalizeBorderNodeIds } from './normalize-border-node-ids';

/**
 * Normalizes node identities in all sections provided.
 * This ensures consistent node identity across the border pipeline.
 * Replaces the problematic deep-copy approach that breaks node identities.
 */
export function normalizeSections(sections: Array<BorderSection>): Array<BorderSection> {
  // Extract all edges from all sections
  const allEdges = sections.flatMap(section => section.edges);
  
  // Normalize all nodes at the pipeline entry point
  normalizeBorderNodeIds(allEdges);
  
  return sections;
}

export { normalizeBorderNodeIds };