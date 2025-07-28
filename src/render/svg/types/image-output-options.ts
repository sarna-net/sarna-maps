import { Dimensions2d, Rectangle2d } from '../../../common';
import { ScaleDisplayOptions } from './scale-display-options';
import { SnapPosition } from '../../../Constants';

export interface BasicDisplayOptions {
  dimensions: Dimensions2d;
  viewRect: Rectangle2d;
  displayPoissonPoints?: boolean;
  displayDelaunayTriangles?: boolean;
  displayVoronoiNodes?: boolean;
  displayBorderEdges?: boolean;
  displayBorderSections?: boolean;
  displayBorders?: boolean;
  curveBorderEdges?: boolean;
  displayNebulae?: boolean;
  displayClusters?: boolean;
  factions?: {
    displayBorders?: boolean;
    displayBorderLabels?: boolean;
    displayFactionNames?: boolean;
    fillAreas?: boolean;
  };
  systems?: {
    displayAbandonedSystems?: boolean;
    displayApocryphalSystems?: boolean;
    displayNormalSystems?: boolean;
    displayNoRecordSystems?: boolean;
    highlightCapitalSystems?: boolean;
    displaySystemNames?: boolean;
  };
  displayPointsOfInterest?: boolean;
}

export interface ImageOutputOptions extends BasicDisplayOptions {
  name: string;
  path?: string;
  customStyles?: string;
  systemNamesDropShadow?: boolean;
  factionNamesDropShadow?: boolean;
  scale?: ScaleDisplayOptions;
  minimap?: MinimapDisplayOptions;
}

export interface MinimapDisplayOptions extends BasicDisplayOptions {
  display?: boolean;
  position: SnapPosition;
}
