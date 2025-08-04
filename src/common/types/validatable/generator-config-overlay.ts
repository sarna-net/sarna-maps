interface GeneratorConfigOverlayItemBase {
  /**
   * The overlay's name
   */
  name: string;
  /**
   * The top left point of the overlay
   */
  position: { x: number; y: number; };
}

/**
 * A text item
 */
export interface GeneratorConfigOverlayItemText extends GeneratorConfigOverlayItemBase {
  /**
   * Overlay type identifier
   */
  type: 'text';
  attributes: {
    text: string;
  }
}

/**
 * A fixed SVG template to use as an overlay, e.g. a logo image
 */
export interface GeneratorConfigOverlayItemSvgElement extends GeneratorConfigOverlayItemBase {
  /**
   * Overlay type identifier
   */
  type: 'svgElement';
  attributes: {
    /**
     * The element's svg template
     * Should be relative to the src/render/svg/templates directory
     */
    svgTemplate: string;
    /**
     * The element's css template
     */
    cssTemplate?: string;
    /**
     * Factor to scale the element by, 1 by default
     */
    scale?: number;
  }
}

/**
 * A simple rectangle
 */
export interface GeneratorConfigOverlayItemRectangle extends GeneratorConfigOverlayItemBase {
  /**
   * Overlay type identifier
   */
  type: 'rectangle';
  attributes: {
    /**
     * The frame's height in pixels
     */
    width: number;
    /**
     * The frame's height in pixels
     */
    height: number;
    /**
     * The width of the frame's border, in pixels (defaults to 0)
     */
    strokeWidth?: number;
    /**
     * The color of the frame's border, in css color format (defaults to black)
     */
    strokeColor?: string;
    /**
     * The frame's fill color, in svg fill format (defaults to none)
     */
    fillColor?: string;
  }
}

/**
 * A scale object, giving a visual indicator of scale and distance.
 * Scales are black and white and change colors between one "step", e.g. after 10 LY.
 */
export interface GeneratorConfigOverlayItemScale extends GeneratorConfigOverlayItemBase {
  /**
   * Overlay type identifier
   */
  type: 'scale';
  attributes: {
    /**
     * The pixel per map units factor
     * Usually calculated by dividing the map layer pixel width by the map layer map unit width
     */
    pixelsPerMapUnit: number;
    /**
     * The number of map units after which the color changes between black and white
     */
    step: number;
    /**
     * The map unit to extend the scale to
     */
    max: number;
    /**
     * Position the labels above (default) or below the scale?
     */
    labelsPosition?: 'above' | 'below';
    /**
     * Scale height in pixels, defaults to 10
     */
    scaleHeight?: number;
    /**
     * The map units' name, defaults to 'LY' (= Light Year)
     */
    mapUnitName?: string;
  }
}

export declare type GeneratorConfigOverlay =
  GeneratorConfigOverlayItemRectangle |
  GeneratorConfigOverlayItemText |
  GeneratorConfigOverlayItemSvgElement |
  GeneratorConfigOverlayItemScale;
