import * as fs from 'fs';
import * as path from 'path';
import {
  Faction,
  System,
  Point2d,
  PoissonDisc,
  TextTemplate,
  DelaunayTriangle,
} from '../../common';
import {
  VoronoiBorderEdge,
  BorderEdgeLoop,
  BorderDelaunayVertex,
  VoronoiBorderNode,
  BorderSection,
  LabelRectangle,
  PointWithAffiliation,
  FactionLabel,
  BorderLabelsResult,
  SalientPoint,
} from '../../compute'
import { ImageOutputOptions } from './types';
import {
  renderBorderEdges,
  renderBorderLabels,
  renderBorderLoops,
  renderBorderSections,
  renderDelaunayTriangles,
  renderPoissonPoints,
  renderSystems,
  renderSystemLabels,
  renderVoronoiNodes,
  renderFactionLabels,
  renderSalients,
  renderPointsOfInterest,
  renderSarnaLogo,
  getSvgTransform,
} from './functions';

export function writeSvgMap(
  items: {
    eraIndex: number;
    systems: Array<System>;
    factions: Record<string, Faction>;
    poisson: PoissonDisc<PointWithAffiliation>;
    delaunayVertices: Array<BorderDelaunayVertex>;
    delaunayTriangles: Array<DelaunayTriangle<BorderDelaunayVertex>>;
    voronoiNodes: Array<VoronoiBorderNode>;
    borderEdges: Record<string, Array<VoronoiBorderEdge>>;
    borderSections: Array<BorderSection>;
    borderLoops: Record<string, Array<BorderEdgeLoop>>;
    salientPoints: Array<SalientPoint>;
    threeWayNodes: Record<string, Array<string>>;
    borderEdgesMap: Record<string, VoronoiBorderEdge>;
    borderLabels: BorderLabelsResult;
    pointsOfInterest: Array<Point2d>;
    systemLabels: Array<LabelRectangle>;
    factionLabels: Array<FactionLabel>;
  },
  options: ImageOutputOptions
) {
  // svg viewBox's y is top left, not bottom left
  // viewRect is in map space, viewBox is in svg space
  // const viewBox = `${options.viewRect.anchor.x} ` +
  //   `${-options.viewRect.anchor.y - options.viewRect.dimensions.height} ` +
  //   `${options.viewRect.dimensions.width} ` +
  //   `${options.viewRect.dimensions.height}`;

  const { css: poissonCss, markup: poissonMarkup } = !options.displayPoissonPoints
    ? { css: '', markup: '' }
    : renderPoissonPoints(
        items.poisson.generatedPoints,
        items.poisson.settings.radius,
      );

  const { css: delaunayCss, markup: delaunayMarkup } = !options.displayDelaunayTriangles
    ? { css: '', markup: '' }
    : renderDelaunayTriangles(items.delaunayTriangles);

  const { css: voronoiCss, markup: voronoiMarkup } = !options.displayVoronoiNodes
    ? { css: '', markup: '' }
    : renderVoronoiNodes(items.voronoiNodes, items.delaunayVertices);

  const { css: borderEdgesCss, markup: borderEdgesMarkup } = !options.displayBorderEdges
    ? { css: '', markup: '' }
    : renderBorderEdges(items.borderEdges);

  const { css: borderSectionsCss, markup: borderSectionsMarkup } = !options.displayBorderSections
    ? { css: '', markup: '' }
    : renderBorderSections(items.borderSections, options.curveBorderEdges);

  const { defs: borderDefs, css: bordersCss, markup: bordersMarkup } = !options.displayBorders
    ? { defs: '', css: '', markup: '' }
    : renderBorderLoops(items.borderLoops, items.factions, options.curveBorderEdges);

  const { css: poiCss, markup: poiMarkup } = !options.displayPointsOfInterest
    ? { css: '', markup: '' }
    : renderPointsOfInterest(items.pointsOfInterest);

  const { css: salientsCss, markup: salientsMarkup } = !options.debug?.displaySalients
    ? { css: '', markup: '' }
    : renderSalients(items.salientPoints);

  const {
    css: borderLabelsCss,
    markup: borderLabelsMarkup,
    defs: borderLabelsDefs,
  } = !options.factions?.displayBorderLabels
    ? { css: '', markup: '', defs: '' }
    : renderBorderLabels(items.borderLabels, items.factions);

  const { defs: systemDefs, css: systemsCss, markup: systemsMarkup } = renderSystems(
    items.systems,
    items.factions,
    items.eraIndex,
  );

  const { css: systemLabelsCss, markup: systemLabelsMarkup } = renderSystemLabels(
    items.systemLabels,
    false
  );

  const { defs: factionLabelDefs, css: factionLabelCss, markup: factionLabelsMarkup } = !options.factions?.displayFactionNames
    ? { css: '', markup: '' }
    : renderFactionLabels(items.factionLabels);

  const { css: logoCss, markup: logoMarkup } = false
    ? { css: '', markup: '' }
    : renderSarnaLogo(1.5, { x: 10, y: options.dimensions.height - 160 });

  const docTemplate = new TextTemplate('map-base-new.svg.tpl', path.join(__dirname, './templates'));
  const mapSpaceContainer = new TextTemplate('map-space-container.svg.tpl', path.join(__dirname, './templates'));
  const { scale, translate } = getSvgTransform(
    options.dimensions,
    options.mainMapElementsRect.dimensions,
    options.mainMapElementsRect.anchor,
  );
  // const scale = Math.min(options.dimensions.width, options.dimensions.height) /
  //   Math.min(options.mainMapElementsRect.dimensions.width, options.mainMapElementsRect.dimensions.height);
  // const translate =
  //   (-options.mainMapElementsRect.anchor.x).toFixed(2) + 'px,'
  //   + (options.mainMapElementsRect.anchor.y + options.mainMapElementsRect.dimensions.height).toFixed(2) + 'px';

  // console.log('dimensions', options.universeDimensions, 'elementsRect', options.mainMapElementsRect);
  // console.log('scale', scale);
  const mapSpaceElements = mapSpaceContainer.replace({
    scale,
    translate,
    css_class: 'main-map',
    elements: poissonMarkup +
      delaunayMarkup +
      voronoiMarkup +
      borderEdgesMarkup +
      borderSectionsMarkup +
      bordersMarkup +
      borderLabelsMarkup +
      factionLabelsMarkup +
      systemsMarkup +
      systemLabelsMarkup +
      poiMarkup +
      salientsMarkup,
  });
  const content = docTemplate.replace({
    width: options.dimensions.width,
    height: options.dimensions.height,
    // viewbox: viewBox,
    defs: borderDefs + systemDefs + factionLabelDefs + borderLabelsDefs,
    css: poissonCss +
      delaunayCss +
      voronoiCss +
      borderEdgesCss +
      borderSectionsCss +
      bordersCss +
      borderLabelsCss +
      factionLabelCss +
      systemsCss +
      systemLabelsCss +
      poiCss +
      salientsCss +
      logoCss,
    elements:
      mapSpaceElements +
      logoMarkup,
  });

  const outPath = path.join(
    options.path ? options.path : path.join(process.cwd(), 'out'),
    `${options.name}.svg`);
  console.info(`Now attempting to write file "${outPath}"`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, { encoding: 'utf8' });
  console.info(`Wrote file "${outPath}".`);
}
