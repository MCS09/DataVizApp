'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDataContext } from '../DataContext';
import CSVDataGrid from '../components/CSVDataGrid';
import { ColDef } from 'ag-grid-community';
import Papa from 'papaparse';

export default function DataCleaningPage() {
  const { metadata, accessToken } = useDataContext();
  const router = useRouter();
  const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);
  const [rowData, setRowData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!metadata || !accessToken) {
      router.push('/data/data-selection');
      return;
    }

    const loadAndParseCSV = async () => {
      try {
        setLoading(true);
        console.log('Loading CSV from Google Drive:', metadata.id, accessToken);

        // Fetch the CSV file from Google Drive
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${metadata.id}?alt=media`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }

        const csvData = await response.text();

        // Parse CSV data
        // Update the parsing complete callback to properly type the results
        Papa.parse(csvData, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              console.warn('CSV parsing warnings:', results.errors);
            }

            if (results.data.length === 0) {
              setError('The CSV file appears to be empty');
              return;
            }

            // Generate column definitions from the first row
            // Type assertion for the first row
            const firstRow = results.data[0] as Record<string, unknown>;
            const generatedColumnDefs = Object.keys(firstRow).map((key) => ({
              field: key,
              headerName: key,
            }));

            setColumnDefs(generatedColumnDefs);
            setRowData(results.data as Record<string, unknown>[]);
            setLoading(false);
          },
        });
      } catch (err) {
        console.error('Error loading CSV:', err);
        setError(err instanceof Error ? err.message : 'Failed to load CSV data');
        setLoading(false);
      }
    };

    loadAndParseCSV();
  }, [metadata, accessToken, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">Loading CSV data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="alert alert-error shadow-lg">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
        <button 
          className="btn btn-primary mt-4"
          onClick={() => router.push('/data/data-selection')}
        >
          Back to File Selection
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Data Cleaning: {metadata?.name}</h1>
        <div className="flex gap-2">
          <button className="btn btn-primary">Save Changes</button>
          <button 
            className="btn btn-outline"
            onClick={() => router.push('/data/data-selection')}
          >
            Select Different File
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Columns</div>
            <div className="stat-value">{columnDefs.length}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Rows</div>
            <div className="stat-value">{rowData.length}</div>
          </div>
        </div>
      </div>

      <CSVDataGrid 
        columnDefs={columnDefs} 
        rowData={rowData} 
      />
    </div>
  );
}