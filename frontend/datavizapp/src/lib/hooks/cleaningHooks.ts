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

          embedded_input = io.StringIO(embedded_input)
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

// Define a new type that can be either a Google Drive source or a local File
type FileDataSource = FileData | File;

export function useLoadDataFrame() {
  const [fileData, setFileData] = useState<FileDataSource | null>(null);
  const [dataFrame, setDataFrame] = useState<DataFrame | null>(null);
  const [columns, setColumns] = useState<ColumnProfile[] | undefined>();

  const { isReady, executeEmbeddedCode, loading, error } = usePyFunctions();

  useEffect(() => {
    if (!isReady || !fileData) return;

    const load = async () => {
      try {
        const fileContent = await (async () => {
          if ('id' in fileData) {
            // It's a Google Drive file
            const url = `https://www.googleapis.com/drive/v3/files/${fileData.id}?alt=media`;
            const response = await fetch(url, {
              headers: { Authorization: `Bearer ${fileData.accessToken}` },
            });
            if (!response.ok) {
              throw new Error(`Error fetching file: ${response.statusText}`);
            }
            return response.text();
          } else {
            // It's a local File object
            return fileData.text();
          }
        })();

        // The rest of the function proceeds as before
        const result = await executeEmbeddedCode(
          `
          df = pd.read_csv(embedded_input)
          # ... (rest of your python code is unchanged) ...
          cell_df = df.reset_index().rename(columns={df.index.name or "index": "recordNumber"})
          cell_df = cell_df.melt(id_vars=["recordNumber"], var_name="columnName", value_name="data")
          col_map = {name: i for i, name in enumerate(df.columns)}
          cell_df["columnNumber"] = cell_df["columnName"].map(col_map)
          def infer_python_type(series: pd.Series) -> str:
              non_null = series.dropna()
              if non_null.empty: return "NoneType"
              sample = non_null.iloc[0]
              return type(sample).__name__
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
          cell_df["data"] = cell_df["data"].astype(str)
          output = {
              "headers": headers,
              "data": cell_df[["recordNumber", "columnNumber", "data"]].to_dict(orient="records")
          }
          import json
          output_json = json.dumps(output)
          `,
          fileContent
        );

        const jsonResult = safeJsonParse<{headers: ColumnProfile[], data: DataFrame}>(result);
        if (!jsonResult) throw new Error("Error loading dataframe");

        setDataFrame(jsonResult.data);
        setColumns(jsonResult.headers);
        
      } catch (err) {
        console.error("Failed to load dataframe:", err);
      }
    };

    load();
  }, [isReady, fileData, executeEmbeddedCode]);

  return { columns, dataFrame, fileData, loading, error, setFileData };
}