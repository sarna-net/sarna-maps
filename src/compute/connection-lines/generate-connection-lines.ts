import { ConnectionLine, distance, pointIsInRectangle, Rectangle2d, System } from '../../common';

/**
 * Generates a list of lines connecting systems, e.g. to indicate jump connections between them
 *
 * @param systems The list of all systems
 * @param viewRect The bounds of the visible section
 * @param minimumDistance The minimum distance at which two systems will be connected
 * @param maximumDistance The maximum distance at which two systems will be connected
 */
export function generateConnectionLines(
  systems: Array<System>,
  viewRect: Rectangle2d,
  minimumDistance = 1,
  maximumDistance = 30,
) {
  const connectionLines: Array<ConnectionLine> = [];
  // For each system, look at all other systems and connect all systems in range.
  // Note: We are going to brute force this list for now. If better performance is needed in the future,
  // we could use a grid or octree.
  for (let i = 0; i < systems.length; i++) {
    if (systems[i].isCluster) {
      continue;
    }
    for (let j = i + 1; j < systems.length; j++) {
      if (systems[j].isCluster) {
        continue;
      }
      if (!pointIsInRectangle(systems[i], viewRect) && !pointIsInRectangle(systems[j], viewRect)) {
        // none of the systems is visible -> no need to display this connection
        continue;
      }
      const distanceBetweenSystems = distance(systems[i], systems[j]);
      if ((distanceBetweenSystems >= minimumDistance) && (distanceBetweenSystems <= maximumDistance)) {
        connectionLines.push({
          id: systems[i].id + '__' + systems[j].id,
          distance: distanceBetweenSystems,
          from: {
            x: systems[i].x,
            y: systems[i].y,
          },
          to: {
            x: systems[j].x,
            y: systems[j].y,
          }
        });
      }
    }
  }

  return connectionLines;
}
