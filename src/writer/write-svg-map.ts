import * as fs from 'fs';
import * as path from 'path';
import { Logger, Template } from '../utils';
import { BorderEdge, BorderEdgeLoop, Faction, System, PoissonDisc, DelaunayVertex, VoronoiNode, DelaunayTriangle } from '../mapgen';
import { ImageOutputOptions } from './types';
import { renderBorderEdges, renderBorders, renderDelaunayTriangles, renderPoissonPoints, renderSystems, renderVoronoiTriangles } from './render-functions';

export function writeSvgMap(
  poisson: PoissonDisc,
  systems: System[],
  factions: Record<string, Faction>,
  delaunayVertices: DelaunayVertex[],
  delaunayTriangles: DelaunayTriangle[],
  voronoiNodes: VoronoiNode[],
  borderEdges: Record<string, BorderEdge[]>,
  borderLoops: Record<string, BorderEdgeLoop[]>,
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
        poisson.radius,
      );

  const { css: delaunayCss, markup: delaunayMarkup } = !options.displayDelaunayTriangles
    ? { css: '', markup: '' }
    : renderDelaunayTriangles(delaunayTriangles);

  const { css: voronoiCss, markup: voronoiMarkup } = !options.displayVoronoiNodes
    ? { css: '', markup: '' }
    : renderVoronoiTriangles(voronoiNodes, delaunayVertices);

  const { css: borderEdgesCss, markup: borderEdgesMarkup } = !options.displayBorderEdges
    ? { css: '', markup: '' }
    : renderBorderEdges(borderEdges);

  const { css: systemsCss, markup: systemsMarkup } = renderSystems(
    systems,
    factions,
    15,
  );

  const borders = renderBorders(borderLoops, factions);

  const docTemplate = new Template('map-base.svg');
  const content = docTemplate.replace({
    width: options.dimensions.width,
    height: options.dimensions.height,
    viewbox: viewBox,
    defs: '',
    css: poissonCss +
      delaunayCss +
      voronoiCss +
      borderEdgesCss +
      systemsCss,
    elements: poissonMarkup +
      delaunayMarkup +
      voronoiMarkup +
      borders +
      borderEdgesMarkup +
      systemsMarkup
  });

  const outPath = path.join(
    options.path ? options.path : path.join(process.cwd(), 'out'),
    `${options.name}.svg`);
  Logger.info(`Now attempting to write file "${outPath}"`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, { encoding: 'utf8' });
  Logger.info(`Wrote file "${outPath}".`);
}
