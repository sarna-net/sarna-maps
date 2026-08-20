// Represents configuration for reading data sources
export interface LocalFileConfig {
  /** The local directory containing the SUCKit spreadsheet */
  directory: string;

  /** The filename of the SUCKit spreadsheet */
  filename: string;
}

export interface GoogleSheetsConfig {
  /** Spreadsheet ID for Google Sheets */
  spreadsheetId: string;

  /** Optional sheet name or range */
  range?: string;
}

export interface DataSourceConfig {
  /** Which source to use: 'google' or 'local' */
  useSource: 'google' | 'local';

  /** Config for Google Sheets source */
  googleSheetsConfig?: GoogleSheetsConfig;

  /** Config for local XLSX source */
  localFileConfig?: LocalFileConfig;
}

// Generator config may now include safe overrides
export interface GeneratorConfig {
  /** Enable debug logging */
  debugMode?: boolean;

  /**
   * Optional partial override for local file source.
   *
   * This allows the generator config to override
   * either or both fields of LocalFileConfig:
   * - directory
   * - filename
   *
   * This intentionally uses Partial<> so that
   * the generator can override only the fields
   * it needs without requiring both.
   */
  localFileConfig?: Partial<LocalFileConfig>;

  // ... other generator-specific options
}
