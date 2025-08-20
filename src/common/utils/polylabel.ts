import { TinyQueue } from './tinyqueue';
import { logger } from './logger';

/**
 * Adapted from https://github.com/mapbox/polylabel, as that library unfortunately does not like to be imported as a
 * CommonJS module.
 * The library is ISC licensed, so this adaptation should be fine.
 */

export declare type PolyLabelPoint = [number, number];
export declare type PolyLabelPolygon = Array<Array<PolyLabelPoint>>;

export interface PolyLabelResult {
  x: number;
  y: number;
  distance: number;
}

class Cell {
  x: number;
  y: number;
  h: number;
  d: number;
  max: number;

  constructor(
    x: number,
    y: number,
    h: number,
    polygon: PolyLabelPolygon,
  ) {
    this.x = x; // cell center x
    this.y = y; // cell center y
    this.h = h; // half the cell size
    this.d = pointToPolygonDist(x, y, polygon); // distance from cell center to polygon
    this.max = this.d + this.h * Math.SQRT2; // max distance to polygon within a cell
  }
}

export function polylabel(polygon: PolyLabelPolygon, precision = 1.0, debug = false): PolyLabelResult {
  // find the bounding box of the outer ring
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x, y] of polygon[0]) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const cellSize = Math.max(precision, Math.min(width, height));

  if (cellSize === precision) {
    return {
      x: minX,
      y: minY,
      distance: 0,
    }
  }

  // a priority queue of cells in order of their "potential" (max distance to polygon)
  const cellQueue = new TinyQueue([] as Array<Cell>, (a, b) => b.max - a.max);

  // take centroid as the first best guess
  let bestCell = getCentroidCell(polygon);

  // second guess: bounding box centroid
  const bboxCell = new Cell(minX + width / 2, minY + height / 2, 0, polygon);
  if (bboxCell.d > bestCell.d) bestCell = bboxCell;

  let numProbes = 2;

  function potentiallyQueue(x: number, y: number, h: number) {
    const cell = new Cell(x, y, h, polygon);
    numProbes++;
    if (cell.max > bestCell.d + precision) cellQueue.push(cell);

    // update the best cell if we found a better one
    if (cell.d > bestCell.d) {
      bestCell = cell;
      if (debug) logger.debug(`found best ${Math.round(1e4 * cell.d) / 1e4} after ${numProbes} probes`);
    }
  }

  // cover polygon with initial cells
  let h = cellSize / 2;
  for (let x = minX; x < maxX; x += cellSize) {
    for (let y = minY; y < maxY; y += cellSize) {
      potentiallyQueue(x + h, y + h, h);
    }
  }

  while (cellQueue.length) {
    // pick the most promising cell from the queue
    const {
      max,
      x,
      y,
      h: ch
    } = cellQueue.pop() as Cell;

    // do not drill down further if there's no chance of a better solution
    if (max - bestCell.d <= precision) break;

    // split the cell into four cells
    h = ch / 2;
    potentiallyQueue(x - h, y - h, h);
    potentiallyQueue(x + h, y - h, h);
    potentiallyQueue(x - h, y + h, h);
    potentiallyQueue(x + h, y + h, h);
  }

  if (debug) {
    logger.debug(`num probes: ${numProbes}\nbest distance: ${bestCell.d}`);
  }

  return {
    x: bestCell.x,
    y: bestCell.y,
    distance: bestCell.d,
  };
}

// signed distance from point to polygon outline (negative if point is outside)
function pointToPolygonDist(x: number, y: number, polygon: PolyLabelPolygon) {
  let inside = false;
  let minDistSq = Infinity;

  for (const ring of polygon) {
    for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
      const a = ring[i];
      const b = ring[j];

      if ((a[1] > y !== b[1] > y) &&
        (x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0])) inside = !inside;

      minDistSq = Math.min(minDistSq, getSegDistSq(x, y, a, b));
    }
  }

  return minDistSq === 0 ? 0 : (inside ? 1 : -1) * Math.sqrt(minDistSq);
}

// get polygon centroid
function getCentroidCell(polygon: PolyLabelPolygon) {
  let area = 0;
  let x = 0;
  let y = 0;
  const points = polygon[0];

  for (let i = 0, len = points.length, j = len - 1; i < len; j = i++) {
    const a = points[i];
    const b = points[j];
    const f = a[0] * b[1] - b[0] * a[1];
    x += (a[0] + b[0]) * f;
    y += (a[1] + b[1]) * f;
    area += f * 3;
  }
  const centroid = new Cell(x / area, y / area, 0, polygon);
  if (area === 0 || centroid.d < 0) return new Cell(points[0][0], points[0][1], 0, polygon);
  return centroid;
}

// get squared distance from a point to a segment
function getSegDistSq(px: number, py: number, a: PolyLabelPoint, b: PolyLabelPoint) {
  let x = a[0];
  let y = a[1];
  let dx = b[0] - x;
  let dy = b[1] - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);

    if (t > 1) {
      x = b[0];
      y = b[1];

    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = px - x;
  dy = py - y;

  return dx * dx + dy * dy;
}
