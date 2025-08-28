import { GeneratorConfigMapLayer } from './generator-config-map-layer';
import { GeneratorConfigOverlay } from './generator-config-overlay';

// IMPORTANT: Whenever you change something in this file, re-run
//   npm start build:validation-interfaces
// to make sure that generator configs can still be validated correctly

export interface GeneratorConfig {
  /**
   * Output type (only svg available at the moment)
   */
  output: 'svg';
  /**
   * Debug mode on (default false)
   */
  debugMode?: boolean;
  /**
   * color theme (default light)
   */
  theme?: 'light' | 'dark';
  /**
   * Where to save the generated files
   */
  fileOutput: {
    /**
     * The directory path, either relative or absolute
     */
    directory: string;
    /**
     * The file name pattern. Dynamic content available as follows:
     * - {{SYSTEMINDEX}} The system's 0-based index (only if we are iterating by system)
     * - {{SYSTEMID}} The system's numeric ID (only if we are iterating by system)
     * - {{SYSTEMNAME}} The system's name (only if we are iterating by system)
     * - {{ERAINDEX}} The map era's 0-based index
     * - {{ERAID}} The map era's ID
     * - {{ERAYEAR}} The map era's year
     * - {{ERANAME}} The map era's full name
     */
    fileNamePattern: string;
  };
  /**
   * The eras to create images for - either a list of era indices (0-based), or empty for all eras
   */
  eras?: number[];
  /**
   * The map objects to iterate over:
   * One map image will be generated for each matched object and each era.
   * If left empty, only one map image will be generated for each era.
   */
  iterateObjects?: {
    /**
     * The type of iteration map object (only systems avaiable at the moment)
     */
    type: 'system';
    /**
     * The file regular expression name pattern.
     * If empty, all objects of the selected type will be matched and iterated over.
     */
    pattern?: string;
  }
  /**
   * Output image pixel size
   */
  dimensions: {
    width: number;
    height: number;
  };
  /**
   * The different layers showing maps
   */
  mapLayers: GeneratorConfigMapLayer[];
  /**
   * Other items on top of the map layers
   */
  overlays?: GeneratorConfigOverlay[];
}
