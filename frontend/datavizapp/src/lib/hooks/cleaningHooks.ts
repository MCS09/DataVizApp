import { useCallback, useEffect, useState } from "react";
import { usePyodide } from "./usePyodide";
import { FileData } from "../dataset";
import { safeJsonParse } from "../api";
import { ColumnProfile } from "@/app/data/pipeline/profiling/components/CarouselItem";

// Like xlsx [{DataCell}] and each data cell
export type DataFrame = DataCell[];
export type DataCell = {
  recordNumber: number,
  columnNumber: number,
  data: string
}

export type ColumnData = {
  datasetId: string;
  columnNumber: number;
  dataRecords: {
    recordNumber: number;
    value: string;
  }[];
};

export function mapDataFrameToColumnData(datasetId: string, dataFrame: DataFrame): ColumnData[] {
  const grouped: { [key: number]: ColumnData } = {};

  dataFrame.forEach(cell => {
    if (!grouped[cell.columnNumber]) {
      grouped[cell.columnNumber] = {
        datasetId,
        columnNumber: cell.columnNumber,
        dataRecords: []
      };
    }

    grouped[cell.columnNumber].dataRecords.push({
      recordNumber: cell.recordNumber,
      value: String(cell.data ?? "")
    });
  });

  return Object.values(grouped);
}

const CSV_TO_CELL_CODE = `
  df = pd.read_csv(embedded_input_stream)

  # Melt into cell-oriented format
  cell_df = df.reset_index().rename(columns={df.index.name or "index": "recordNumber"})
  cell_df = cell_df.melt(id_vars=["recordNumber"], var_name="columnName", value_name="data")

  # Map column names to indices
  col_map = {name: i for i, name in enumerate(df.columns)}
  cell_df["columnNumber"] = cell_df["columnName"].map(col_map)

  # Function to infer actual Python type name
  def infer_python_type(series: pd.Series) -> str:
      # drop nulls to avoid errors
      non_null = series.dropna()
      if non_null.empty:
          return "NoneType"
      sample = non_null.iloc[0]
      return type(sample).__name__   # e.g. 'int', 'float', 'str', 'bool', 'Timestamp'

  # Build headers with python type
  headers = [
      {
          "columnNumber": i,
          "columnName": name,
          "columnDescription": "",
          "dataType": infer_python_type(df[name]),
          "relationship": ""
      }
      for i, name in enumerate(df.columns)
  ]

  # Ensure all data is string for output
  cell_df["data"] = cell_df["data"].astype(str)

  output = {
      "headers": headers,
      "data": cell_df[["recordNumber", "columnNumber", "data"]].to_dict(orient="records")
  }

  import json
  output_json = json.dumps(output)
`;

export function usePyFunctions() {
  const { pyodide, isReady } = usePyodide(); // assume you already have a provider
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeEmbeddedCode = useCallback(
    async (embeddedCode: string, embeddedInput: string) => {
      if (!pyodide) throw new Error("Pyodide not loaded yet");
      try {
        setLoading(true);
        setError(null);

        pyodide.globals.set("embedded_input", embeddedInput);

        const jsonStr = await pyodide.runPythonAsync(`
          import pandas as pd
          import numpy as np
          import io

          embedded_input_text = embedded_input
          embedded_input_stream = io.StringIO(embedded_input_text)
          embedded_input = embedded_input_text
          ${embeddedCode}
          output_json
        `);
        return jsonStr;
      } catch (err) {
        setError(err as Error);
        throw err; // rethrow so caller knows
      } finally {
        setLoading(false);
      }
    },
    [pyodide]
  );

  return { loading, error, isReady, executeEmbeddedCode };
}

export function useLoadDataFrame() {
  const [googleFileData, setGoogleFileData] = useState<FileData | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [dataFrame, setDataFrame] = useState<DataFrame | null>(null);
  const [columns, setColumns] = useState<ColumnProfile[] | undefined>();
  const [loadError, setLoadError] = useState<Error | null>(null);

  const { isReady, executeEmbeddedCode, loading, error: pyError } = usePyFunctions();

  const resetDerivedState = useCallback(() => {
    setDataFrame(null);
    setColumns(undefined);
  }, []);

  const setFileData = useCallback((data: FileData | null) => {
    resetDerivedState();
    setLoadError(null);
    setFileContent(null);
    setGoogleFileData(data);
  }, [resetDerivedState]);

  const loadFromCsvContent = useCallback((csvText: string) => {
    resetDerivedState();
    setLoadError(null);
    setGoogleFileData(null);
    setFileContent(csvText);
  }, [resetDerivedState]);

  const reset = useCallback(() => {
    resetDerivedState();
    setLoadError(null);
    setGoogleFileData(null);
    setFileContent(null);
  }, [resetDerivedState]);

  useEffect(() => {
    if (!isReady) return;
    if (!googleFileData && fileContent === null) return;

    let isCurrent = true;

    const load = async () => {
      try {
        let csvText = fileContent;
        if (csvText == null && googleFileData) {
          const url = `https://www.googleapis.com/drive/v3/files/${googleFileData.id}?alt=media`;
          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${googleFileData.accessToken}` },
          });
          if (!response.ok) {
            throw new Error(`Error fetching file: ${response.statusText}`);
          }
          csvText = await response.text();
        }

        if (csvText == null || !isCurrent) {
          return;
        }

        const result = await executeEmbeddedCode(CSV_TO_CELL_CODE, csvText);
        if (!isCurrent) {
          return;
        }

        const jsonResult = safeJsonParse<{ headers: ColumnProfile[]; data: DataFrame }>(result);

        if (!jsonResult) {
          throw new Error("Error loading dataframe");
        }

        setDataFrame(jsonResult.data);
        setColumns(jsonResult.headers);
      } catch (err) {
        if (!isCurrent) return;
        console.error("Failed to load dataframe:", err);
        setLoadError(err as Error);
      }
    };

    load();

    return () => {
      isCurrent = false;
    };
  }, [isReady, googleFileData, fileContent, executeEmbeddedCode]);

  const combinedError = pyError ?? loadError;

  return {
    columns,
    dataFrame,
    fileData: googleFileData,
    loading,
    error: combinedError,
    setFileData,
    loadFromCsvContent,
    resetDataFrame: reset,
  };
}