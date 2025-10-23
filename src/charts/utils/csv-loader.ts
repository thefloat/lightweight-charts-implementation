/**
 * Provides static methods for loading CSV file content as string from the public directory.
 */
export class CSVLoader {
  /**
   * Loads the content of a CSV file as a string.
   * Assumes running in a browser environment where 'fetch' is available
   * and the public directory is served at the web server's root.
   * @param {string} filePathInPublic - Path to the CSV file relative to the public directory (e.g., 'data/file.csv').
   * @returns {Promise<string|null>} A Promise that resolves with the CSV content as a string, or null if an error occurs during fetch.
   */
  static async loadCSVText(filePathInPublic: string): Promise<string | null> {
    const csvFileURL: string = filePathInPublic.startsWith('/')
      ? filePathInPublic
      : `/${filePathInPublic}`;

    console.log('Loading data from', filePathInPublic);

    try {
      const response: Response = await fetch(csvFileURL);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${csvFileURL}: HTTP status ${response.status}`);
      }
      
      // Confirm response content type, should be csv or text
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('text/csv') && !contentType?.includes('text/plain')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      const csvText: string = await response.text();

      console.log(`Successfully loaded CSV data from ${csvFileURL}`);
      return csvText;
    } catch (error) {
      console.error(`Error loading CSV from ${csvFileURL}:`, error);
      return null;
    }
  }
}