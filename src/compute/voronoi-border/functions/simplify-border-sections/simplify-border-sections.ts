import { BorderSection, BorderDelaunayVertex } from '../../types';
import { pruneShortEdges } from './prune-short-edges';
import { relaxBorderSection } from './relax-border-section';
import { mergeStraightEdges } from './merge-straight-edges';
import { subdivideDangerousEdges } from './subdivide-dangerous-edges';

/**
 * Simplifies all border sections by pruning short edges and straightening / relaxing edge sequences.
 * Note that the passed border sections will be modified.
 *
 * @param borderSections The list of border sections to simplify
 * @param vertices The full list of delaunay vertices (required for position reference)
 * @param threeWayNodes An object mapping node IDs of voronoi nodes with 3 or more adjacent affiliations
 *  to their adjacent edge IDs (will be modified during pruning)
 */
export function simplifyBorderSections(
  borderSections: Array<BorderSection>,
  vertices: Array<BorderDelaunayVertex>,
  threeWayNodes: Record<string, Array<string>>,
) {
  let shortEdgesPruned = 0;
  let straightEdgesPruned = 0;
  let edgesSubdivided = 0;
  borderSections.forEach((borderSection) => {
    shortEdgesPruned += pruneShortEdges(borderSection, vertices, threeWayNodes, 4);
    relaxBorderSection(borderSection, vertices, 0.4);
    shortEdgesPruned += pruneShortEdges(borderSection, vertices, threeWayNodes, 4);
    straightEdgesPruned += mergeStraightEdges(borderSection, vertices, threeWayNodes);
    edgesSubdivided += subdivideDangerousEdges(borderSection, vertices, threeWayNodes);
  });

  console.info(`${shortEdgesPruned} edges removed during short edge pruning`);
  console.info(`${straightEdgesPruned} edges removed during straight edge pruning`);
  console.info(`${edgesSubdivided} dangerous edges subdivided`);
}
