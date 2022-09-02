export interface BasicDisplayOptions {
  dimensions: Dimensions2d;
  viewRect: Rectangle2d;
  displayPoissonPoints?: boolean;
  displayDelaunayTriangles?: boolean;
  displayVoronoiNodes?: boolean;
  displayBorderEdges?: boolean;
  displayBorders?: boolean;
  displayNebulae?: boolean;
  displayClusters?: boolean;
  factions?: {
    displayBorders?: boolean;
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