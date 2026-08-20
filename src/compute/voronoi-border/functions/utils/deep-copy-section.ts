import { BorderSection, VoronoiBorderEdge, VoronoiBorderNode } from '../../types';

/**
 * Creates a deep copy of a border section preserving node identities.
 * Ensures that all edges and nodes in the copy maintain their original reference identity.
 * Used to prevent node identity loss during pipeline processing.
 */
export function deepCopySection(section: BorderSection): BorderSection {
  const node1 = createDeepCopyNode(section.node1);
  const node2 = createDeepCopyNode(section.node2);
  const edges = section.edges.map(edge => createDeepCopyEdge(edge, node1, node2));
  
  const copy: BorderSection = {
    ...section,
    node1,
    node2,
    edges,
  };
  
  if (section.children) {
    copy.children = Object.fromEntries(
      Object.entries(section.children).map(([key, childSections]) => [
        key,
        childSections.map(deepCopySection)
      ])
    );
  }
  
  return copy;
}

function createDeepCopyNode(node: VoronoiBorderNode): VoronoiBorderNode {
  return {
    ...node,
    borderAffiliations: { ...node.borderAffiliations },
  };
}

function createDeepCopyEdge(
  edge: VoronoiBorderEdge, 
  originalNode1: VoronoiBorderNode, 
  originalNode2: VoronoiBorderNode
): VoronoiBorderEdge {
  return {
    ...edge,
    node1: findOrCreateNode(originalNode1, edge.node1),
    node2: findOrCreateNode(originalNode2, edge.node2),
  };
}

function findOrCreateNode(originalNode: VoronoiBorderNode, potentialCopy: VoronoiBorderNode): VoronoiBorderNode {
  return originalNode.id === potentialCopy.id ? originalNode : potentialCopy;
}