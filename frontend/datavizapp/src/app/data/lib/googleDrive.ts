// lib/googleDrive.ts
import { google } from 'googleapis';
import { parse, ParseResult } from 'papaparse';

interface CSVData {
  columns: string[];
  rows: Record<string, unknown>[];
  rawData?: string;
}

interface DriveAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class GoogleDriveService {
  private drive: ReturnType<typeof google.drive>;
  
  constructor(authConfig: DriveAuthConfig) {
    const auth = new google.auth.OAuth2(
      authConfig.clientId,
      authConfig.clientSecret,
      authConfig.redirectUri
    );
    this.drive = google.drive({ version: 'v3', auth });
  }

  async getCSVData(fileId: string): Promise<CSVData> {
    try {
      const response = await this.drive.files.get({
        fileId,
        alt: 'media'
      }, { responseType: 'text' });

      const csvString = response.data as string;
      const results = parse(csvString, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true
      }) as ParseResult<Record<string, unknown>>;

      if (!results.meta.fields) {
        throw new Error('CSV file has no headers or is improperly formatted');
      }

      return {
        columns: results.meta.fields,
        rows: results.data,
        rawData: csvString
      };
    } catch (error) {
      console.error('Error processing CSV:', error);
      throw new Error('Failed to process CSV file');
    }
  }
}