export interface DataSourceConfig {
  /**
   * Whether to use local csv files (default) or a google spreadsheet
   */
  useSource: 'local' | 'google';

  /**
   * The type of local data source
   */
  dataSourceType?: 'csv';

  /**
   * The config object for local csv files
   */
  localFileConfig?: {
    /**
     * The directory containing the csv files
     * If using a relative path, the directory is interpreted to be relative to the project's root directory.
     */
    directory: string;
    /**
     * The filename of the systems csv file
     */
    systemsFilename: string;
    /**
     * The filename of the factions csv file
     */
    factionsFilename?: string;
    /**
     * The filename of the era description csv (optional, auto-discovered if omitted)
     */
    descriptionFilename?: string;
    /**
     * Specify the data source type
     */
    dataSourceType?: 'csv';
  };

  /**
   * The config object for Google sheets
   */
  googleSheetsConfig?: {
    /**
     * The Google API key
     */
    apiKey: string;
    /**
     * The Google spreadsheet's ID
     */
    spreadsheetId: string;
  };

  /**
   * 0-based indices of the different sheets that are required to draw the maps
   */
  sheetIndices?: {
    /**
     * Index of the sheet containing column and era names
     */
    columns: number;
    /**
     * Index of the sheet containing the systems
     */
    systems: number;
    /**
     * Index of the sheet containing the factions
     */
    factions: number;
    /**
     * Index of the sheet containing the nebulae (TODO not currently used)
     */
    nebulae: number;
  }
}
