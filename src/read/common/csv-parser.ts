import fs from 'fs';
import path from 'path';

export type ErrorCode = 
  'FILE_NOT_FOUND' | 
  'INVALID_FORMAT' | 
  'HEADER_VALIDATION_FAILED' | 
  'PARSE_ERROR' | 
  'COLUMN_MAPPING_FAILED' | 
  'DATA_CONVERSION_ERROR';

export const CsvErrorCodes = {
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  INVALID_FORMAT: 'INVALID_FORMAT',
  HEADER_VALIDATION_FAILED: 'HEADER_VALIDATION_FAILED',
  PARSE_ERROR: 'PARSE_ERROR',
  COLUMN_MAPPING_FAILED: 'COLUMN_MAPPING_FAILED',
  DATA_CONVERSION_ERROR: 'DATA_CONVERSION_ERROR'
} as const;

export class CsvError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public originalError?: Error,
    public filePath?: string
  ) {
    super(message);
    this.name = 'CsvError';
  }
}

export interface CsvRecord {
  [key: string]: string;
}

export interface MatrixRecord extends Array<string> {}
export type CsvParsedData = Array<CsvRecord>;
export type MatrixData = Array<MatrixRecord>;

export interface CsvParserConfig {
  delimiter?: string;
  quote?: string;
  escape?: string;
  skipEmptyLines?: boolean;
  encoding?: string;
}

export interface ColumnMapping {
  headerName: string;
  columnIndex: number;
}

export class CsvParser {
  private config: CsvParserConfig;

  constructor(config: CsvParserConfig = {}) {
    this.config = {
      delimiter: ',',
      quote: '"',
      escape: '\\',
      skipEmptyLines: true,
      encoding: 'utf8',
      ...config
    };
  }

  public async parseFile(filePath: string): Promise<CsvParsedData> {
    if (!fs.existsSync(filePath)) {
      throw new CsvError(CsvErrorCodes.FILE_NOT_FOUND, `File not found: ${filePath}`, undefined, filePath);
    }

    const content = fs.readFileSync(filePath, this.config.encoding as BufferEncoding);
    return this.parse(content);
  }

  public parse(content: string): CsvParsedData {
    try {
      const { headerRow, rows } = this.splitRecords(content);

      if (!headerRow || headerRow.length === 0) {
        throw new CsvError(CsvErrorCodes.HEADER_VALIDATION_FAILED, 'Invalid CSV headers');
      }

      const mappedHeaders = headerRow.map((header, index) => ({
        headerName: header.trim().toLowerCase(),
        columnIndex: index
      }));

      const result: CsvParsedData = [];
      for (const parsedValues of rows) {
        const row: CsvRecord = {};
        for (const header of mappedHeaders) {
          row[header.headerName] =
            header.columnIndex < parsedValues.length ? parsedValues[header.columnIndex] : '';
        }
        result.push(row);
      }

      return result;
    } catch (error) {
      if (error instanceof CsvError) {
        throw error;
      }
      throw new CsvError(
        CsvErrorCodes.PARSE_ERROR,
        `Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Parses the content into a matrix (string[][]) with the header row as the
   * first element, preserving the physical column order of the source file.
   */
  public parseMatrix(content: string): MatrixData {
    const { headerRow, rows } = this.splitRecords(content);
    return [headerRow, ...rows];
  }

  /**
   * Splits raw CSV content into a header row and data rows.
   *
   * Parses character-by-character over the whole content (not line-by-line) so
   * that quoted fields spanning multiple physical lines are handled correctly.
   * A quote that is left unterminated at end-of-content is tolerated by closing
   * it implicitly, rather than aborting the entire parse (which previously made
   * a single malformed cell fail the whole data import).
   */
  private splitRecords(content: string): {
    headerRow: Array<string>;
    rows: Array<Array<string>>;
  } {
    const delimiter = this.config.delimiter ?? ',';
    const quote = this.config.quote ?? '"';
    const escape = this.config.escape ?? '\\';

    const rows: Array<Array<string>> = [];
    let currentRow: Array<string> = [];
    let currentValue = '';
    let inQuotes = false;
    let i = 0;
    const n = content.length;

    const endField = () => {
      currentRow.push(currentValue);
      currentValue = '';
    };
    const endRow = () => {
      endField();
      rows.push(currentRow);
      currentRow = [];
    };

    while (i < n) {
      const char = content[i];
      const nextChar = i + 1 < n ? content[i + 1] : '';

      if (inQuotes) {
        if (char === escape && nextChar === quote) {
          currentValue += quote;
          i += 2;
        } else if (char === quote) {
          inQuotes = false;
          i++;
        } else {
          currentValue += char;
          i++;
        }
        continue;
      }

      // Not in quotes
      if (char === quote) {
        inQuotes = true;
        i++;
      } else if (char === delimiter) {
        endField();
        i++;
      } else if (char === '\n') {
        endRow();
        i++;
      } else if (char === '\r') {
        // Handle CRLF: consume \r, and the following \n if present.
        if (nextChar === '\n') {
          i++;
        }
        endRow();
        i++;
      } else {
        currentValue += char;
        i++;
      }
    }

    // Flush the final field/row (tolerate an unterminated trailing quote).
    if (currentValue.length > 0 || currentRow.length > 0 || inQuotes) {
      endRow();
    }

    if (rows.length === 0) {
      return { headerRow: [], rows: [] };
    }

    const headerRow = rows.shift()!;
    const dataRows = this.config.skipEmptyLines
      ? rows.filter((row) => row.some((cell) => cell.trim() !== ''))
      : rows;

    return { headerRow, rows: dataRows };
  }

  public parseToMatrix(records: CsvParsedData): MatrixData {
    return normalizeToMatrixFormat(records);
  }

  public convertToMatrixFormat(records: Array<CsvRecord>): Array<Array<string>> {
    return normalizeToMatrixFormat(records);
  }

  public static detectDelimiter(sample: string, maxLines = 10): string {
    const lines = sample.split(/\r?\n/).filter(line => line.trim() && !line.startsWith('#'));
    const delimiterCounts: Record<string, number> = {};
    
    const delimiters = [',', '|'];
    
    for (const delimiter of delimiters) {
      let count = 0;
      for (const line of lines.slice(0, Math.min(maxLines, lines.length))) {
        const matches = line.match(new RegExp(`\${delimiter}(?=(?:[^"]*"[^"]*")*[^"]*$)`, 'g'));
        if (matches) {
          count += matches.length;
        }
      }
      delimiterCounts[delimiter] = count;
    }

    return Object.entries(delimiterCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .map(([delimiter]) => delimiter)[0] || ',';
  }

  public validateHeaders(mappedHeaders: Array<ColumnMapping>, requiredColumns: Array<string>): void {
    const missingColumns = requiredColumns.filter(col => 
      !mappedHeaders.some(header => header.headerName === col.toLowerCase())
    );
    
    if (missingColumns.length > 0) {
      throw new CsvError(
        CsvErrorCodes.HEADER_VALIDATION_FAILED,
        `Missing required columns: ${missingColumns.join(', ')}`
      );
    }
  }
}

export function normalizeToMatrixFormat(records: Array<Record<string, string>>): Array<Array<string>> {
  if (!records || records.length === 0) {
    return [];
  }

  const headers = Object.keys(records[0]);
  const matrix: Array<Array<string>> = [headers];

  for (const record of records) {
    const row: Array<string> = [];
    for (const header of headers) {
      row.push(record[header] || '');
    }
    matrix.push(row);
  }

  return matrix;
}
