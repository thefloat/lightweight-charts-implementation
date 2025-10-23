import { UTCTimestamp, LineData, HistogramData, CandlestickData } from 'lightweight-charts';

/**
 * Represents a single row parsed from the CSV, where keys are header names and values are the corresponding cell values.
 * All values are initially strings before further processing.
 */
interface CsvRow {
  [key: string]: string;
}

export interface TradeEvent {
  time: UTCTimestamp
  event: string
}

/**
 * Parses CSV text data into structured formats for lightweight charts data (like candlestick or volume data).
 * Handles CSV parsing, data column validation ('time', 'close', 'volume' etc.), and normalization of time values to UTCTimestamp.
 */
class CSVParser {
  /**
   * The parsed CSV data, stored as an array of objects.
   * Each object represents a row, with keys corresponding to header columns.
   */
  private data: CsvRow[];
  private headers: string[];

  /**
   * Creates an instance of CsvParser.
   * @param csvText - The CSV text to parse.
   */
  constructor(csvText: string) {
    const result = this._parseCSV(csvText);
    this.data = result.data;
    this.headers = result.headers;
  }

  /**
   * Parses CSV text into an array of CsvRow objects.
   * Assumes the first row is the header.
   * @param csvText - The CSV data as a string.
   * @returns An array of objects representing the CSV rows.
   * @throws {Error} If CSV text is empty or header is missing.
   * @private
   */
  private _parseCSV(csvText: string): { data: CsvRow[], headers: string[] } {
    if (!csvText || csvText.trim() === '') {
      throw new Error("CSV text cannot be empty.");
    }
    const rows = csvText.trim().split('\n');
    if (rows.length < 2) {
      throw new Error("CSV must contain a header row and at least one data row.");
    }

    const headers: string[] = rows[0].split(',').map(h => h.trim());
    const data: CsvRow[] = [];

    for (let i = 1; i < rows.length; i++) {
      const values: string[] = rows[i].split(',').map(v => v.trim());
      if (values.length === headers.length) {
        const entry: CsvRow = {};
        headers.forEach((key, index) => {
          entry[key] = values[index];
        });
        data.push(entry);
      } else {
        console.warn(`Skipping row ${i + 1}: Incorrect number of columns. Expected ${headers.length}, got ${values.length}.`);
      }
    }
    return { data, headers };
  }

  /**
   * Normalizes a time value from a string to a UTCTimestamp (Unix epoch in seconds).
   * Handles both date strings (parsable by Date.parse) and numeric timestamps in seconds.
   * @param timeValue - The time value string from the CSV. Expected to be either:
   * - A date string (e.g., "YYYY-MM-DDTHH:mm:ssZ", "YYYY-MM-DD")
   * - A Unix timestamp in seconds (as a string)
   * @returns The a UTCTimestamp (in seconds) or NaN if parsing fails.
   * @private
   */
  private _normalizeTime(timeValue: string): UTCTimestamp {
    // Try parsing as a date string first
    const date = Date.parse(timeValue);
    if (!isNaN(date)) {
      return (date / 1000) as UTCTimestamp; // Convert milliseconds to seconds
    }

    // If not a date string, try parsing as a numeric timestamp (assumed to be in seconds)
    const numericTimestamp = parseFloat(timeValue);
    if (!isNaN(numericTimestamp) && isFinite(numericTimestamp)) {
      return numericTimestamp as UTCTimestamp;
    }

    console.warn(`Could not parse time value: "${timeValue}" as date string or numeric timestamp (seconds).`);
    return NaN as UTCTimestamp;
  }

  /**
   * Validates if all required columns are present in the header.
   * @param header - The header columns from the CSV.
   * @param requiredColumns - The columns required for the specific data type.
   * @throws {Error} If any required column is missing.
   * @private
   */
  private _validateColumns(requiredColumns: string[]): void {
    const missingColumns = requiredColumns.filter(col => !this.headers.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }
  }

  /**
   * Retrieves the parsed CSV data as an array of CsvRow objects.
   * @returns {CsvRow[]} An array containing the parsed CSV data rows
   */
  getData(): CsvRow[] {
    return this.data;
  }
  
  /**
   * Returns an array of header strings from the CSV data.
   * @returns {string[]} An array containing the column headers of the CSV data
   */
  getHeaders(): string[] {
    return this.headers;
  }

  /**
   * Parses CSV data into an array of TradeEvent objects.
   * Required columns: 'time', 'event'.
   * Time is normalized to a UTCTimestamp (seconds since epoch).
   * 
   * @param requiredColumn - The name of the column to map to the event field in TradeEvent
   * @returns Array of TradeEvent objects containing time and event data
   * @throws {Error} If no data is available to parse or if required columns are missing
   */
  public parseTradeEvents(): TradeEvent[] {
    if (!this.data || this.data.length === 0) {
      throw new Error("No data available to parse. Ensure CSV was loaded correctly.");
    }
    const requiredColumns = ['time', 'event'];
    this._validateColumns(requiredColumns);

    return this.data
      .map((row: CsvRow):  TradeEvent=> ({
        time: this._normalizeTime(row.time),
        event: row.event, // Map requred column to 'event' field
      }));
  }

  /**
   * Parses line data from the stored CSV data.
   * Requires 'time' and the column specified by `requiredColumn` to be present in the CSV header.
   * Time is normalized to a UTCTimestamp (seconds since epoch).
   * @param requiredColumn - The header name of the column containing the numerical data for the line series.
   * @returns An array of LineData objects, each with a normalized time and a parsed value.
   * @throws {Error} If required columns are missing in the CSV header or if data hasn't been parsed yet.
   */
  public parseLineData(requiredColumn: string): LineData[] {
    if (!this.data || this.data.length === 0) {
      throw new Error("No data available to parse. Ensure CSV was loaded correctly.");
    }
    const requiredColumns = ['time', requiredColumn];
    this._validateColumns(requiredColumns);

    return this.data
      .map((row: CsvRow): LineData => ({
        time: this._normalizeTime(row.time),
        value: parseFloat(row[requiredColumn]), // Map requred column to 'value' field
      }));
  }

  /**
   * Parses histogram data from the stored CSV data.
   * Requires 'time' and the column specified by `requiredColumn` to be present in the CSV header.
   * Time is normalized to a UTCTimestamp (seconds since epoch).
   * Rows with unparseable time or volume are filtered out.
   * @returns An array of HistogramData objects, each with a normalized time and a parsed value.
   * @throws {Error} If required columns are missing in the CSV header or if data hasn't been parsed yet.
   */
  public parseHistogramData(requiredColumn: string): HistogramData[] {
    if (!this.data || this.data.length === 0) {
      throw new Error("No data available to parse. Ensure CSV was loaded correctly.");
    }
    const requiredColumns = ['time', requiredColumn];
    this._validateColumns(requiredColumns);

    return this.data
      .map((row: CsvRow): HistogramData => ({
        time: this._normalizeTime(row.time),
        value: parseFloat(row[requiredColumn]), // Map requred column to 'value' field
      }));
  }

  /**
   * Parses candlestick data from the stored CSV data.
   * Required columns: 'time', 'open', 'high', 'low', 'close'.
   * Time is normalized to a UTCTimestamp (seconds since epoch).
   * Rows with unparseable time are filtered out.
   * @returns Parsed candlestick data.
   * @throws {Error} If required columns are missing in the CSV header or if data hasn't been parsed yet.
   */
  public parseCandlestickData(): CandlestickData[] {
    if (!this.data || this.data.length === 0) {
      // Handle case where constructor might have failed or CSV was empty after header
      throw new Error("No data available to parse. Ensure CSV was loaded correctly.");
    }
    const requiredColumns = ['time', 'open', 'high', 'low', 'close'];
    this._validateColumns(requiredColumns);

    return this.data
      .map((row: CsvRow): CandlestickData => ({
        time: this._normalizeTime(row.time),
        open: parseFloat(row.open),
        high: parseFloat(row.high),
        low: parseFloat(row.low),
        close: parseFloat(row.close),
      }));
  }
}

export default CSVParser;