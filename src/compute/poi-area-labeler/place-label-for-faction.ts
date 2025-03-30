import { BorderEdgeLoop } from '../voronoi-border';
import {
  copyVector,
  Faction, normalizeVector,
  Point2d,
  polylabel,
  PolyLabelPolygon,
  scaleVector,
  vectorLength
} from '../../common';
import { getLabelTokens } from './get-label-tokens';

/**
 * Uses the polylabel library to find the "point of inaccessibility" for a state area polygon, i.e. the point that
 * is farthest away from any border. The polylabel result also contains a distance value which is the "safe" radius
 * for our label path.
 * Using the POI and the radius, we can then create a label path that is curved according to distance to Terra
 * (origin at 0,0).
 *
 * @see https://www.npmjs.com/package/polylabel
 */
export async function placeLabelForFaction(faction: Faction, borderLoops: Array<BorderEdgeLoop>) {
  const labelTokens = getLabelTokens(faction.name);

  const polygon: PolyLabelPolygon = borderLoops.map(
    (loop) => {
      return loop.edges.map((edge) => [edge.node1.x, edge.node1.y]);
    }
  );
  const poi = polylabel(polygon);

  // const distanceFromOrigin = vectorLength({ a: poi.x, b: poi.y })
  // const controlPointVector = scaleVector({ a: poi.x, b: poi.y }, distanceFromOrigin / 7);
  const perpendicularVector = scaleVector({ a: -poi.x, b: poi.y }, poi.distance);
  const normalizedPerpendicularVector = { ...perpendicularVector };
  normalizeVector(normalizedPerpendicularVector);
  normalizedPerpendicularVector.b *= 0.05;
  scaleVector(normalizedPerpendicularVector, poi.distance * 2);
  copyVector(normalizedPerpendicularVector, perpendicularVector);

  const labelPath: Point2d[] = [];
  labelPath.push(
    { x: poi.x - perpendicularVector.a, y: poi.y - perpendicularVector.b },
    { x: poi.x + perpendicularVector.a, y: poi.y + perpendicularVector.b },
  );
  if (labelPath[0].x > labelPath[1].x) {
    labelPath.reverse();
  }

  return {
    labelTokens,
    labelPath,
    labelPathLength: poi.distance * 2,
  };
}
