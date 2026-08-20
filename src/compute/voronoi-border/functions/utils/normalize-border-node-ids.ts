import { VoronoiBorderEdge } from '../../types';
import { BorderNodeStore } from '../../../../common';

/**
 * Backward-compatible re-export for migration.
 * @deprecated Use BorderNodeStore directly. This function creates a temporary
 * store on each call, which is correct for one-shot use but does not retain
 * cross-pipeline state. Call `nodeStore.canonicalizeEdges(edges)` instead.
 */
export function normalizeBorderNodeIds(edges: Array<VoronoiBorderEdge>) {
  const store = new BorderNodeStore();
  for (const edge of edges) {
    store.register(edge.node1);
    store.register(edge.node2);
  }
  store.canonicalizeEdges(edges);
}

/**
 * @deprecated Use `nodeStore.getOrCreate(x, y)` instead.
 */
export function freshNodeId(_prefix = 'n'): string {
  return `deprecated-fresh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * @deprecated No longer needed — BorderNodeStore is scoped per
 * calculateVoronoiBorders call, so there is no cross-era collision.
 */
export function resetFreshNodeCounter(): void {
  // no-op
}
