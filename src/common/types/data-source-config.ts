export interface DataSourceConfig {
  /**
   * Whether to use a local xlsx file (default) or a google spreadsheet
   */
  useSource: 'local' | 'google';

  /**
   * The config object for local xlsx files
   */
  localFileConfig?: {
    /**
     * The directory containing the xlsx file
     * If using a relative path, the directory is interpreted to be relative to the project's root directory.
     */
    directory: string;
    /**
     * The filename of the spreadsheet
     */
    filename: string;
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
  sheetIndices: {
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
