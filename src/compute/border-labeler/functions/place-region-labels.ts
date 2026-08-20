import {
  BorderLabelConfig,
  GlyphConfig,
  IdentifiableRectangle,
  Point2d,
  polylabel,
  Rectangle2d,
  RectangleGrid,
  SystemLabelConfig,
  logger,
} from '../../../common';
import { BorderEdgeLoop } from '../../voronoi-border';
import { sanitizeFactionToken } from '../../../render/svg/functions/sanitize-faction-token';

export interface RegionLabelResult {
  defs: string;
  css: string;
  markup: string;
}

export interface RegionLabelCandidate {
  regionKey: string;
  regionName: string;
  anchor: Point2d;
  width: number;
  height: number;
  score: number;
  color: string;
}

interface RegionLabelPlacement {
  anchor: Point2d;
  score: number;
}

/**
 * Pre-filtered faction border edges: a spatial grid of each edge's bounding box,
 * plus the exact edge segments. The grid is used to quickly find the (usually few)
 * edges whose bounding box intersects a candidate label rect before performing the
 * exact segment/rect intersection test.
 */
interface FactionBorderEdges {
  grid: RectangleGrid;
  segments: Record<string, { p1: Point2d; p2: Point2d }>;
}

const REGION_LABEL_PADDING = 0.5;
const REGION_LABEL_STROKE_WIDTH = 0.3;

/**
 * Place one border label per region (hierarchy levels 1+) in the region's center
 * or largest empty space.
 *
 * Overlap guarantees:
 * - Region labels never overlap system labels, faction border labels, or other
 *   region labels (checked via the shared label grid).
 * - Region labels never overlap faction (top-level) borders, unless the region's
 *   hierarchy level is at or above the configured `regionLabelBorderOverlapThreshold`
 *   (see border-label.config.yaml).
 * - Overlapping region borders (levels 1+) is allowed, matching the behavior of
 *   labels that are placed inside their own region.
 */
export function placeRegionLabels(
  borderLoops: Record<string, Array<BorderEdgeLoop>>,
  levelIndex: number,
  factionMap: Record<string, any>,
  labelGrid: RectangleGrid,
  glyphConfig: GlyphConfig,
  viewRect: Rectangle2d,
  globalSystemLabelConfig: SystemLabelConfig,
  borderLabelConfig: BorderLabelConfig,
  factionBorderLoops?: Record<string, Array<BorderEdgeLoop>>,
): RegionLabelResult | null {
  const allCandidates: RegionLabelCandidate[] = [];

  const overlapThreshold = borderLabelConfig.rules.regionLabelBorderOverlapThreshold ?? 2;
  const mustAvoidFactionBorders = levelIndex < overlapThreshold;

  const factionBorderEdges = mustAvoidFactionBorders && factionBorderLoops
    ? collectFactionBorderEdges(factionBorderLoops, viewRect)
    : null;

  // iterate in deterministic order
  for (const regionKey of Object.keys(borderLoops).sort()) {
    if (regionKey === 'EMPTY' || regionKey === 'I' || regionKey === 'D' || regionKey.startsWith('D-')) continue;
    if (regionKey.endsWith(',Unassigned') || regionKey === 'Unassigned') continue;

    const regionName = extractRegionName(regionKey, levelIndex);
    if (!regionName) continue;

    const loops = borderLoops[regionKey];
    if (!loops || loops.length === 0) continue;

    const labelWidth = measureTextWidth(regionName, glyphConfig);
    const labelHeight = glyphConfig.regular.lineHeight + (globalSystemLabelConfig?.padding?.y || 0) * 2;
    const factionColor = getFactionColor(regionKey, factionMap);

    const placement = findBestRegionLabelPlacement(
      loops,
      labelWidth,
      labelHeight,
      labelGrid,
      viewRect,
      factionBorderEdges,
    );

    if (!placement) {
      logger.warn(
        'place-region-labels.ts',
        `No suitable label position found for region "${regionName}" (${regionKey}) at level ${levelIndex}`,
      );
      continue;
    }

    const rect = makeLabelRect(placement.anchor, labelWidth, labelHeight);
    labelGrid.placeItem({
      id: `region-label-${regionKey}`,
      anchor: { ...rect.anchor },
      dimensions: { ...rect.dimensions },
    });

    allCandidates.push({
      regionKey,
      regionName,
      anchor: placement.anchor,
      width: labelWidth,
      height: labelHeight,
      score: placement.score,
      color: factionColor,
    });

    logger.debug(
      `[region-label] placed "${regionName}" (${regionKey}) at ` +
      `(${placement.anchor.x.toFixed(2)}, ${placement.anchor.y.toFixed(2)}) score=${placement.score.toFixed(2)}`,
    );
  }

  if (allCandidates.length === 0) return null;

  return renderRegionLabels(allCandidates, levelIndex);
}

/**
 * Extract the region name for the given hierarchy level from a hierarchical
 * region key such as "FWL,Principality of Regulus" or
 * "DC,Benjamin Military District,Benjamin Prefecture".
 */
function extractRegionName(regionKey: string, levelIndex: number): string | null {
  const parts = regionKey.split(',');
  if (parts.length === 0) return null;
  if (parts.length <= levelIndex) return parts[parts.length - 1]?.trim() || null;
  const name = parts[levelIndex]?.trim();
  return name || null;
}

function getFactionColor(regionKey: string, factionMap: Record<string, any>): string {
  const parts = regionKey.split(',');
  const factionId = parts[0];
  let faction = factionMap[factionId] || factionMap[factionId.toUpperCase()];
  if (!faction && parts.length >= 2) {
    const fullKey = parts.join(',');
    faction = factionMap[fullKey] || factionMap[fullKey.toUpperCase()];
  }
  return faction?.color || '#666666';
}

function measureTextWidth(text: string, glyphConfig: GlyphConfig): number {
  const settings = glyphConfig.borderLabels || glyphConfig.regular;
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    width += settings.widths[text[i]] || settings.widths.default;
  }
  return width;
}

/**
 * Find the best label position for a region.
 *
 * Strategy:
 * 1. Region centroid (if inside the region polygon).
 * 2. Pole of inaccessibility (largest empty space, via polylabel).
 * 3. Deterministic iterative ring sampling around the best-known center.
 *
 * Each candidate must be inside the view, free of label overlaps and (depending on
 * the configured threshold) free of faction border intersections. Positions whose
 * label rect lies fully inside the region polygon are preferred over positions that
 * only keep the label center inside.
 */
function findBestRegionLabelPlacement(
  loops: BorderEdgeLoop[],
  labelWidth: number,
  labelHeight: number,
  labelGrid: RectangleGrid,
  viewRect: Rectangle2d,
  factionBorderEdges: FactionBorderEdges | null,
): RegionLabelPlacement | null {
  let best: RegionLabelPlacement | null = null;

  for (const loop of loops) {
    const polygon = loop.edges.map((e) => e.node1);
    if (polygon.length < 3) continue;

    const candidates = generatePlacementCandidates(polygon, labelWidth, labelHeight);

    for (const candidate of candidates) {
      const rect = makeLabelRect(candidate.anchor, labelWidth, labelHeight);

      if (!isInsideViewRect(rect, viewRect)) continue;
      if (hasOverlap(rect, labelGrid)) continue;
      if (factionBorderEdges && rectIntersectsFactionBorder(rect, factionBorderEdges)) continue;
      if (!isPointInPolygon(candidate.anchor, polygon)) continue;

      const fullyInside = rectCornersInsidePolygon(rect, polygon);
      const score = candidate.score * (fullyInside ? 1 : 0.75);
      if (!best || score > best.score) {
        best = { anchor: candidate.anchor, score };
      }

      // stop searching this loop once a high-quality, fully-inside position is found
      if (fullyInside && candidate.score >= 0.9) break;
    }
  }

  return best;
}

function generatePlacementCandidates(
  polygon: Point2d[],
  labelWidth: number,
  labelHeight: number,
): Array<{ anchor: Point2d; score: number }> {
  const candidates: Array<{ anchor: Point2d; score: number }> = [];

  // 1) centroid
  const centroid = computeLoopCentroid(polygon);
  if (centroid && isPointInPolygon(centroid, polygon)) {
    candidates.push({ anchor: centroid, score: 1 });
  }

  // 2) pole of inaccessibility (largest empty space)
  let poi: { x: number; y: number; distance: number } | null = null;
  try {
    poi = polylabel([polygon.map((p) => [p.x, p.y] as [number, number])]);
  } catch {
    poi = null;
  }
  if (poi && isFinite(poi.x) && isFinite(poi.y) && isPointInPolygon({ x: poi.x, y: poi.y }, polygon)) {
    candidates.push({ anchor: { x: poi.x, y: poi.y }, score: 0.95 });
  }

  // 3) iterative ring sampling around the best-known center
  const bbox = computeBoundingBox(polygon);
  const center = candidates[0]?.anchor
    || (bbox ? { x: (bbox.minX + bbox.maxX) * 0.5, y: (bbox.minY + bbox.maxY) * 0.5 } : { x: 0, y: 0 });
  const maxRadius = bbox
    ? Math.hypot(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY)
    : Math.max(labelWidth, 10);
  const ringStep = Math.max(labelHeight * 0.5, 1.5);
  const ringCount = Math.min(48, Math.max(4, Math.ceil(maxRadius / ringStep)));

  for (let ring = 1; ring <= ringCount; ring++) {
    const radius = ring * ringStep;
    const angleCount = Math.max(8, Math.min(32, Math.round((2 * Math.PI * radius) / ringStep)));
    for (let angleIndex = 0; angleIndex < angleCount; angleIndex++) {
      const angle = (angleIndex / angleCount) * 2 * Math.PI;
      const anchor = {
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      };
      if (isPointInPolygon(anchor, polygon)) {
        candidates.push({ anchor, score: Math.max(0.25, 0.9 - ring * 0.03) });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

function collectFactionBorderEdges(
  borderLoops: Record<string, Array<BorderEdgeLoop>>,
  viewRect: Rectangle2d,
): FactionBorderEdges {
  const grid = new RectangleGrid(viewRect, 10);
  const segments: Record<string, { p1: Point2d; p2: Point2d }> = {};
  let index = 0;

  for (const loops of Object.values(borderLoops)) {
    for (const loop of loops) {
      for (const edge of loop.edges) {
        const id = `faction-border-edge-${index++}`;
        const minX = Math.min(edge.node1.x, edge.node2.x);
        const maxX = Math.max(edge.node1.x, edge.node2.x);
        const minY = Math.min(edge.node1.y, edge.node2.y);
        const maxY = Math.max(edge.node1.y, edge.node2.y);
        grid.placeItem({
          id,
          anchor: { x: minX, y: minY },
          dimensions: {
            width: Math.max(maxX - minX, 0.01),
            height: Math.max(maxY - minY, 0.01),
          },
        });
        segments[id] = { p1: { ...edge.node1 }, p2: { ...edge.node2 } };
      }
    }
  }

  return { grid, segments };
}

function rectIntersectsFactionBorder(rect: Rectangle2d, factionBorderEdges: FactionBorderEdges): boolean {
  const overlaps = factionBorderEdges.grid.getOverlaps({
    id: 'region-label-border-check',
    anchor: rect.anchor,
    dimensions: rect.dimensions,
  });
  for (const overlap of overlaps) {
    const segment = factionBorderEdges.segments[overlap.id];
    if (segment && segmentIntersectsRect(segment.p1, segment.p2, rect)) return true;
  }
  return false;
}

function segmentIntersectsRect(p1: Point2d, p2: Point2d, rect: Rectangle2d): boolean {
  const minX = rect.anchor.x;
  const minY = rect.anchor.y;
  const maxX = rect.anchor.x + rect.dimensions.width;
  const maxY = rect.anchor.y + rect.dimensions.height;

  if (pointInRect(p1, minX, minY, maxX, maxY) || pointInRect(p2, minX, minY, maxX, maxY)) return true;

  const corners = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    if (segmentsIntersect(p1, p2, a, b)) return true;
  }
  return false;
}

function pointInRect(p: Point2d, minX: number, minY: number, maxX: number, maxY: number): boolean {
  return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
}

function orientation(p: Point2d, q: Point2d, r: Point2d): number {
  const v = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  return v > 1e-9 ? 1 : v < -1e-9 ? -1 : 0;
}

function segmentsIntersect(p1: Point2d, p2: Point2d, p3: Point2d, p4: Point2d): boolean {
  const o1 = orientation(p1, p2, p3);
  const o2 = orientation(p1, p2, p4);
  const o3 = orientation(p3, p4, p1);
  const o4 = orientation(p3, p4, p2);
  return o1 !== o2 && o3 !== o4;
}

function makeLabelRect(anchor: Point2d, labelWidth: number, labelHeight: number): Rectangle2d {
  return {
    anchor: {
      x: anchor.x - labelWidth * 0.5 - REGION_LABEL_PADDING,
      y: anchor.y - labelHeight * 0.5 - REGION_LABEL_PADDING,
    },
    dimensions: {
      width: labelWidth + REGION_LABEL_PADDING * 2,
      height: labelHeight + REGION_LABEL_PADDING * 2,
    },
  };
}

function isInsideViewRect(rect: Rectangle2d, viewRect: Rectangle2d): boolean {
  const tol = REGION_LABEL_PADDING;
  return (
    rect.anchor.x >= viewRect.anchor.x - tol &&
    rect.anchor.y >= viewRect.anchor.y - tol &&
    rect.anchor.x + rect.dimensions.width <= viewRect.anchor.x + viewRect.dimensions.width + tol &&
    rect.anchor.y + rect.dimensions.height <= viewRect.anchor.y + viewRect.dimensions.height + tol
  );
}

function hasOverlap(rect: Rectangle2d, labelGrid: RectangleGrid): boolean {
  const testItem: IdentifiableRectangle = {
    id: 'region-label-check',
    anchor: rect.anchor,
    dimensions: rect.dimensions,
  };
  return labelGrid.getOverlaps(testItem).length > 0;
}

function rectCornersInsidePolygon(rect: Rectangle2d, polygon: Point2d[]): boolean {
  const { anchor, dimensions } = rect;
  return (
    isPointInPolygon(anchor, polygon) &&
    isPointInPolygon({ x: anchor.x + dimensions.width, y: anchor.y }, polygon) &&
    isPointInPolygon({ x: anchor.x, y: anchor.y + dimensions.height }, polygon) &&
    isPointInPolygon({ x: anchor.x + dimensions.width, y: anchor.y + dimensions.height }, polygon)
  );
}

function computeBoundingBox(polygon: Point2d[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (polygon.length === 0) return null;
  let minX = polygon[0].x;
  let minY = polygon[0].y;
  let maxX = polygon[0].x;
  let maxY = polygon[0].y;
  for (let i = 1; i < polygon.length; i++) {
    const v = polygon[i];
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
  }
  return { minX, minY, maxX, maxY };
}

function computeLoopCentroid(polygon: Point2d[]): Point2d | null {
  if (polygon.length === 0) return null;
  let sumX = 0;
  let sumY = 0;
  for (const vertex of polygon) {
    sumX += vertex.x;
    sumY += vertex.y;
  }
  return { x: sumX / polygon.length, y: sumY / polygon.length };
}

function isPointInPolygon(point: Point2d, polygon: Point2d[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function renderRegionLabels(
  candidates: RegionLabelCandidate[],
  levelIndex: number,
): RegionLabelResult {
  let innerMarkup = '';

  for (const candidate of candidates) {
    const safeKey = sanitizeFactionToken(candidate.regionKey);
    innerMarkup += `<text class="region-label level-${levelIndex} ${safeKey}" ` +
      `x="${candidate.anchor.x.toFixed(3)}" ` +
      `y="${(-candidate.anchor.y).toFixed(3)}" ` +
      `text-anchor="middle" ` +
      `alignment-baseline="middle" ` +
      `fill="${candidate.color}" ` +
      `stroke="#E6E6E6" ` +
      `stroke-width="0.1" ` +
      `stroke-linejoin="round" ` +
      `stroke-opacity="1" ` +
      `>${escapeXml(candidate.regionName)}</text>\n`;
  }

  const markup = innerMarkup.trim() > ''
    ? `<g class="region-labels-layer level-${levelIndex}">${innerMarkup}</g>`
    : '';

  return { defs: '', css: '', markup };
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}