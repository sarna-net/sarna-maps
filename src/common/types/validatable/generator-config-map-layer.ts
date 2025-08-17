// IMPORTANT: Whenever you change something in this file, re-run
//   npm start build:validation-interfaces
// to make sure that generator configs can still be validated correctly

export interface GeneratorConfigMapLayer {
  /**
   * Map layer name (will not be displayed)
   */
  name: string;
  /**
   * Map layer pixel size. If left empty, the map layer will equal the map image size.
   */
  dimensions?: {
    width: number;
    height: number;
  };
  /**
   * Top left anchor of the map layer, leave empty to place at the top left corner of the map image.
   */
  position?: {
    x: number;
    y: number;
  };
  /**
   * Dimensions of the map layer (in map units)
   */
  mapUnitDimensions: {
    width: number;
    height: number;
  };
  /**
   * The focus point of the map layer (the coordinates that the map layer is centered on).
   * If none is provided, the focus of the map is set to (0,0).
   */
  focus?: {
    /**
     * Focus point
     * - 'system' = The focused system (only available if iterating over systems)
     * - coordinates = The center point coordinates
     */
    point: 'system' | { x: number; y: number; };
    /**
     * Center point offset in map units
     */
    delta?: { x: number; y: number;};
  }

  /**
   * Displayed map elements
   */
  elements: {
    /**
     * Display systems (as dots)
     */
    systems?: boolean;
    /**
     * Display system names
     * Detailed settings see system-labels.config.yaml
     */
    systemLabels?: boolean;
    /**
     * Display faction areas and faction borders
     */
    factions?: {
      /**
       * Only straight border edges (false / empty) or bezier curves (true)
       */
      curveBorderEdges?: boolean;
    }
    /**
     * Display border labels
     * Detailed settings see border-labels.config.yaml
     */
    borderLabels?: boolean;
    /**
     * Draw connection lines (jump lines)
     */
    connectionLines?: {
      /**
       * The minimum distance at which a connection line is drawn (default 1)
       */
      minimumDistance?: number;
      /**
       * The maximum distance at which a connection line is drawn (default 30)
       */
      maximumDistance?: number;
    };
    /**
     * Draw jump rings (circles around the focus point)
     */
    jumpRings?: {
      /**
       * Draw circles with these radii
       */
      radii: number[];
      /**
       * Circle center offset (in map units)
       */
      delta?: { x: number; y: number;};
      /**
       * Stroke widths for the jump rings.
       * If only one width is provided, the same width will be used for all rings.
       * Default is 0
       */
      strokeWidths?: number | number[];
      /**
       * Stroke colors for the jump rings.
       * If only one color is provided, the same color will be used for all rings.
       * Default is black
       */
      strokeColors?: string | string[];
      /**
       * Fill colors for the jump rings.
       * If only one color is provided, the same color will be used for all rings.
       * Default is no fill
       */
      fillColors?: string | string[];
    },
    /**
     * Any directional indicators that the map layer should show (e.g. the arrow to Terra on the minimap)
     */
    directionalIndicators?: GeneratorConfigMapLayerDirectionalIndicator[];
  }
}

export interface GeneratorConfigMapLayerDirectionalIndicator {
  /**
   * Coordinates that the indicator points to
   */
  coordinates: {
    x: number;
    y: number;
  };
  /**
   * The indicator text to display
   */
  text: string;
  /**
   * The size factor for the indicator text (default is 1)
   */
  textSizeFactor?: number;
  /**
   * The indicator arrow's stroke width (default is 4)
   */
  strokeWidth?: number;
  /**
   * The indicator arrow's stroke color (default is white)
   */
  strokeColor?: string;
  /**
   * The indicator arrow's fill color (default is #a00, i.e. red)
   */
  fillColor?: string;
  /**
   * The minimum distance of the coordinates from the visible map rectangle
   * at which the indicator is displayed (default 0)
   */
  minimumIndicatorDistance?: number;
  /**
   * The minimum distance of the coordinates from the visible map rectangle
   * at which a measurement in full map units is displayed (default is 10)
   */
  minimumMeasurementDistance?: number;
  /**
   * The name of the map units (default is "LY")
   */
  mapUnitName?: string;
}
