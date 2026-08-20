import { VoronoiBorderNode, VoronoiBorderEdge } from '../../compute/voronoi-border/types';
import { coordKey, round6 } from '../../compute/voronoi-border/functions/utils/node-coord-key';

/**
 * Single authority for border node identity throughout the pipeline.
 *
 * Every node is stored by its rounded coordinate key. New nodes are created
 * via `getOrCreate`, which returns the canonical node at that coordinate if
 * one already exists — guaranteeing that two edges meeting at the same
 * physical point always reference the same object.
 *
 * This replaces the old pattern of:
 *  - module-level `freshNodeCounter` (cross-era collision risk)
 *  - post-hoc `normalizeBorderNodeIds` (manual discipline, easy to miss)
 *  - implicit node-id divergence after deep-copy or coordinate mutation
 */
export class BorderNodeStore {
  private byCoord = new Map<string, VoronoiBorderNode>();

  getOrCreate(x: number, y: number): VoronoiBorderNode {
    const key = coordKey(x, y);
    let node = this.byCoord.get(key);
    if (!node) {
      node = {
        id: `n-${key}`,
        x,
        y,
        vertex1Idx: 0,
        vertex2Idx: 0,
        vertex3Idx: 0,
        neighborNodeIndices: [],
        borderAffiliations: {},
      } as VoronoiBorderNode;
      this.byCoord.set(key, node);
    }
    return node;
  }

  register(node: VoronoiBorderNode): void {
    const key = coordKey(node.x, node.y);
    if (!this.byCoord.has(key)) {
      this.byCoord.set(key, node);
    }
  }

  get(x: number, y: number): VoronoiBorderNode | undefined {
    return this.byCoord.get(coordKey(x, y));
  }

  getAll(): VoronoiBorderNode[] {
    return [...this.byCoord.values()];
  }

  size(): number {
    return this.byCoord.size;
  }

  /**
   * Relocate a node to a new coordinate, keeping the coordinate index in sync.
   *
   * Simplify passes (relax / prune / subdivide) move nodes by writing `.x`/`.y`
   * directly. Doing so behind the store's back leaves `byCoord` pointing at the
   * node's OLD key: `canonicalize` then looks the node up under its NEW
   * coordinates, finds nothing, and silently no-ops, while a later
   * `getOrCreate` at those same coordinates mints a SECOND object for the same
   * physical point — the phantom node that desyncs the loop graph.
   *
   * Always route coordinate mutation through this method. When another node is
   * already registered at the destination, that node stays canonical and this
   * one simply becomes an alias at the same position; `canonicalizeEdges` will
   * collapse the references afterwards.
   *
   * @param node The node to move (mutated in place)
   * @param x The new x coordinate (rounded to the shared key precision)
   * @param y The new y coordinate (rounded to the shared key precision)
   */
  move(node: VoronoiBorderNode, x: number, y: number): void {
    const oldKey = coordKey(node.x, node.y);
    if (this.byCoord.get(oldKey) === node) {
      this.byCoord.delete(oldKey);
    }
    node.x = round6(x);
    node.y = round6(y);
    const newKey = coordKey(node.x, node.y);
    if (!this.byCoord.has(newKey)) {
      this.byCoord.set(newKey, node);
    }
  }

  /**
   * True when every node reachable from `edges` is the canonical node for its
   * own coordinate. Used by tests and the pipeline validator to assert that no
   * phantom nodes were introduced by the simplify passes.
   */
  verifyIntegrity(edges: VoronoiBorderEdge[]): Array<string> {
    const problems: Array<string> = [];
    for (const edge of edges) {
      for (const node of [edge.node1, edge.node2]) {
        const canonical = this.byCoord.get(coordKey(node.x, node.y));
        if (canonical === undefined) {
          problems.push(`node ${node.id} at ${coordKey(node.x, node.y)} is not registered`);
        } else if (canonical !== node) {
          problems.push(
            `node ${node.id} at ${coordKey(node.x, node.y)} is a phantom duplicate of ${canonical.id}`,
          );
        }
      }
    }
    return problems;
  }

  canonicalize(node: VoronoiBorderNode): VoronoiBorderNode {
    const key = coordKey(node.x, node.y);
    const existing = this.byCoord.get(key);
    if (existing && existing !== node) {
      return existing;
    }
    return node;
  }

  canonicalizeEdges(edges: VoronoiBorderEdge[]): void {
    for (const edge of edges) {
      edge.node1 = this.canonicalize(edge.node1);
      edge.node2 = this.canonicalize(edge.node2);
    }
  }
}
