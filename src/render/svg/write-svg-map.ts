import * as fs from 'fs';
import * as path from 'path';
import {
  Faction,
  Logger,
  System,
  Point2d,
  PoissonDisc,
  TextTemplate, DelaunayTriangle, VoronoiNode,
} from '../../common';
import {
  VoronoiBorderEdge,
  BorderEdgeLoop,
  BorderDelaunayVertex,
  VoronoiBorderNode,
  BorderSection,
  LabelRectangle,
  PointWithAffiliation,
} from '../../compute'
import { ImageOutputOptions } from './types';
import {
  renderBorderEdges,
  renderBorderLoops,
  renderBorderSections,
  renderDelaunayTriangles,
  renderPointsOfInterest,
  renderPoissonPoints,
  renderSystems,
  renderSystemLabels,
  renderVoronoiNodes,
  renderAreaLabels,
} from './functions';

export function writeSvgMap(
  eraIndex: number,
  systems: Array<System>,
  factions: Record<string, Faction>,
  poisson: PoissonDisc<PointWithAffiliation>,
  delaunayVertices: Array<BorderDelaunayVertex>,
  delaunayTriangles: Array<DelaunayTriangle<BorderDelaunayVertex>>,
  voronoiNodes: Array<VoronoiBorderNode>,
  borderEdges: Record<string, Array<VoronoiBorderEdge>>,
  borderSections: Array<BorderSection>,
  borderLoops: Record<string, Array<BorderEdgeLoop>>,
  threeWayNodes: Record<string, Array<string>>,
  borderEdgesMap: Record<string, VoronoiBorderEdge>,
  pointsOfInterest: Array<Point2d>,
  systemLabels: Array<LabelRectangle>,
  areaLabelTriangles: Array<{ p1: Point2d, p2: Point2d, p3: Point2d }>,
  areaLabelNodes: Array<VoronoiNode>,
  options: ImageOutputOptions,
) {
  // svg viewBox's y is top left, not bottom left
  // viewRect is in map space, viewBox is in svg space
  const viewBox = `${options.viewRect.anchor.x} ` +
    `${-options.viewRect.anchor.y - options.viewRect.dimensions.height} ` +
    `${options.viewRect.dimensions.width} ` +
    `${options.viewRect.dimensions.height}`;

  const { css: poissonCss, markup: poissonMarkup } = !options.displayPoissonPoints
    ? { css: '', markup: '' }
    : renderPoissonPoints(
        poisson.generatedPoints,
        poisson.settings.radius,
      );

  const { css: delaunayCss, markup: delaunayMarkup } = !options.displayDelaunayTriangles
    ? { css: '', markup: '' }
    : renderDelaunayTriangles(delaunayTriangles);

  const { css: voronoiCss, markup: voronoiMarkup } = !options.displayVoronoiNodes
    ? { css: '', markup: '' }
    : renderVoronoiNodes(voronoiNodes, delaunayVertices);

  const { css: borderEdgesCss, markup: borderEdgesMarkup } = !options.displayBorderEdges
    ? { css: '', markup: '' }
    : renderBorderEdges(borderEdges);

  const { css: borderSectionsCss, markup: borderSectionsMarkup } = !options.displayBorderSections
    ? { css: '', markup: '' }
    : renderBorderSections(borderSections, options.curveBorderEdges);

  const { defs: borderDefs, css: bordersCss, markup: bordersMarkup } = !options.displayBorders
    ? { defs: '', css: '', markup: '' }
    : renderBorderLoops(borderLoops, factions, options.curveBorderEdges);

  const { css: poiCss, markup: poiMarkup } = !options.displayPointsOfInterest
    ? { css: '', markup: '' }
    : renderPointsOfInterest(pointsOfInterest);

  const { defs: systemDefs, css: systemsCss, markup: systemsMarkup } = renderSystems(
    systems,
    factions,
    eraIndex,
  );

  const { css: systemLabelsCss, markup: systemLabelsMarkup } = renderSystemLabels(
    systemLabels,
    false
  );

  const { css: areaLabelsCss, markup: areaLabelsMarkup } = renderAreaLabels(
    areaLabelTriangles,
    areaLabelNodes,
  );

  // const borders = renderBorders(borderLoops, factions);

  const docTemplate = new TextTemplate('map-base.svg', path.join(__dirname, './templates'));
  const content = docTemplate.replace({
    width: options.dimensions.width,
    height: options.dimensions.height,
    viewbox: viewBox,
    defs: borderDefs + systemDefs,
    css: poissonCss +
      delaunayCss +
      voronoiCss +
      borderEdgesCss +
      borderSectionsCss +
      bordersCss +
      systemsCss +
      systemLabelsCss +
      areaLabelsCss +
      poiCss,
    elements: poissonMarkup +
      delaunayMarkup +
      voronoiMarkup +
      borderEdgesMarkup +
      borderSectionsMarkup +
      bordersMarkup +
      systemsMarkup +
      systemLabelsMarkup +
      areaLabelsMarkup +
      poiMarkup,
  });

  const outPath = path.join(
    options.path ? options.path : path.join(process.cwd(), 'out'),
    `${options.name}.svg`);
  Logger.info(`Now attempting to write file "${outPath}"`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, { encoding: 'utf8' });
  Logger.info(`Wrote file "${outPath}".`);
}
