/**
 * Purpose: Provide helper functions for loading and persisting dataset matrices via existing column endpoints.
 * Params: None.
 * Returns: Utility methods consumed by the cleaning workflow.
 * Steps: 1. Fetch column metadata. 2. Gather column records to build a full table. 3. Push column updates back to the backend.
 */
import { fetchData, postData } from "@/lib/api";
import type { DatasetMatrix } from "./types";

type DatasetColumnResponse = {
  datasetId: number;
  columnNumber: number;
  columnName: string;
  columnDescription: string;
  dataType: string;
  relationship?: string | null;
};

type ColumnDataResponse = {
  datasetId: number;
  columnNumber: number;
  dataRecords: { recordNumber: number; value: string }[];
};

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

const jsonHeaders = {
  "Content-Type": "application/json",
};

/**
 * Purpose: Assemble the full dataset table for cleaning.
 * Params: {datasetId} Target dataset identifier.
 * Returns: Promise<DatasetMatrix> representing headers and rows.
 * Steps: 1. Fetch column definitions. 2. Request each column's data. 3. Merge records into row-oriented structures.
 */
export async function getDatasetMatrix(datasetId: number): Promise<DatasetMatrix> {
  if (!BASE_URL) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured");
  }

  const columnsUrl = `${BASE_URL}/api/Dataset/getColumnsByDatasetId/${datasetId}`;
  const columnResponses = await fetchData<DatasetColumnResponse[]>(columnsUrl, {
    method: "GET",
    headers: jsonHeaders,
  });

  const headers = columnResponses
    .slice()
    .sort((a, b) => a.columnNumber - b.columnNumber)
    .map((column) => ({
      columnNumber: column.columnNumber,
      columnName: column.columnName,
      columnDescription: column.columnDescription,
      dataType: column.dataType,
      relationship: column.relationship ?? undefined,
    }));

  if (headers.length === 0) {
    return {
      datasetId,
      headers: [],
      rows: [],
    };
  }

  const columnData = await Promise.all(
    headers.map(async (header) => {
      const url = `${BASE_URL}/api/Dataset/getColumnData`;
      const response = await fetchData<ColumnDataResponse>(url, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ datasetId, columnNumber: header.columnNumber }),
      });
      return response.dataRecords;
    })
  );

  const recordNumbers = new Set<number>();
  columnData.forEach((records) => {
    records.forEach((record) => recordNumbers.add(record.recordNumber));
  });

  const sortedRecordNumbers = Array.from(recordNumbers).sort((a, b) => a - b);

  const rows = sortedRecordNumbers.map((recordNumber) => {
    const values = columnData.map((records) => {
      const record = records.find((entry) => entry.recordNumber === recordNumber);
      return record?.value ?? "";
    });
    return { recordNumber, values };
  });

  return {
    datasetId,
    headers,
    rows,
  };
}

/**
 * Purpose: Persist changes made in the cleaning grid back to the backend.
 * Params: {matrix} The dataset snapshot to save.
 * Returns: Promise<boolean> indicating whether all column updates succeeded.
 * Steps: 1. Short-circuit when no columns exist. 2. Post each column via the setColumnData endpoint. 3. Evaluate whether every request succeeded.
 */
export async function setDatasetMatrix(matrix: DatasetMatrix): Promise<boolean> {
  if (!BASE_URL) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured");
  }

  if (matrix.headers.length === 0) {
    return true;
  }

  const results = await Promise.all(
    matrix.headers.map((header, columnIndex) => {
      const dataRecords = matrix.rows.map((row) => ({
        recordNumber: row.recordNumber,
        value: row.values[columnIndex] ?? "",
      }));

      const payload = {
        datasetId: matrix.datasetId,
        columnNumber: header.columnNumber,
        dataRecords,
      };

      const url = `${BASE_URL}/api/Dataset/setColumnData`;
      return postData(url, payload, { headers: jsonHeaders });
    })
  );

  return results.every(Boolean);
}
