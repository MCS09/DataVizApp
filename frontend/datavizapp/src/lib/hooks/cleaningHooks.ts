"use client";
import { useCallback, useEffect, useState } from "react";
import { usePyodide } from "./usePyodide";
import { FileData } from "../dataset";
import { safeJsonParse } from "../api";
import { ColumnProfile } from "@/app/data/pipeline/profiling/components/CarouselItem";

// Like xlsx [{DataCell}] and each data cell
export type DataFrame = DataCell[];
export type DataCell = {
  recordNumber: number;
  columnNumber: number;
  data: string;
};

export type ColumnData = {
  datasetId: string;
  columnNumber: number;
  dataRecords: {
    recordNumber: number;
    value: string;
  }[];
};

export function mapDataFrameToColumnData(
  datasetId: string,
  dataFrame: DataFrame
): ColumnData[] {
  const grouped: { [key: number]: ColumnData } = {};

  dataFrame.forEach((cell) => {
    if (!grouped[cell.columnNumber]) {
      grouped[cell.columnNumber] = {
        datasetId,
        columnNumber: cell.columnNumber,
        dataRecords: [],
      };
    }

    grouped[cell.columnNumber].dataRecords.push({
      recordNumber: cell.recordNumber,
      value: String(cell.data ?? ""),
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
import json
import io

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
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [dataFrame, setDataFrame] = useState<DataFrame | null>(null);
  const [columns, setColunns] = useState<ColumnProfile[] | undefined>();

  const { isReady, executeEmbeddedCode, loading, error } = usePyFunctions();

  useEffect(() => {
    if (!isReady || !fileData) return;

    const load = async () => {
      try {
        const url = `https://www.googleapis.com/drive/v3/files/${fileData.id}?alt=media`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${fileData.accessToken}` },
        });
        if (!response.ok) {
          throw new Error(`Error fetching file: ${response.statusText}`);
        }

        const fileContent = await response.text();

        const result = await executeEmbeddedCode(
          `
embedded_input = io.StringIO(embedded_input)
df = pd.read_csv(embedded_input)

# Melt into cell-oriented format
cell_df = df.reset_index().rename(columns={df.index.name or "index": "recordNumber"})
cell_df = cell_df.melt(id_vars=["recordNumber"], var_name="columnName", value_name="data")

# Map column names → indices
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

output_json = json.dumps(output)
          `,
          fileContent
        );

        const jsonResult = safeJsonParse<{
          headers: ColumnProfile[];
          data: DataFrame;
        }>(result);

        if (!jsonResult) throw new Error("Error loading dataframe");

        setDataFrame(jsonResult.data);
        setColunns(jsonResult.headers);
      } catch (err) {
        console.error("Failed to load dataframe:", err);
      }
    };

    load();
  }, [isReady, fileData, executeEmbeddedCode]);

  return { columns, dataFrame, fileData, loading, error, setFileData };
}

export function useCleanColumnDataTester() {
  const [cleanedColumnData, setCleanedColumnData] = useState<{columnData: ColumnData, jsonResult?: string} | undefined>();
  const {isReady, executeEmbeddedCode} = usePyFunctions();
  const [cleaningCode, setCleaningCode] = useState<string | null>(null);
  const [executeCleaning, setExecuteCleaning] = useState<{toExecute: boolean, params?: Record<string, any>}>({toExecute: false});

  useEffect(() => {
    if (!isReady || !cleanedColumnData || !cleaningCode || !executeCleaning.toExecute) return;
    setExecuteCleaning({ toExecute: false });

    (async () => {
      const contextInput = {
        column_data: cleanedColumnData,
        ...(executeCleaning.params || {})
      };

      const result = await executeEmbeddedCode(
        `
import builtins
import json
ctx = json.loads(embedded_input)
# Unpack context keys into local variables
locals().update(ctx)
error_msg = "Success"

try:
${cleaningCode
  .split("\n")
  .map(line => "    " + line)
  .join("\n")}
except Exception as e:
    error_msg = str(e)

# Output the cleaned data
output_json = json.dumps({
  "column_data": column_data,
  "error_msg": error_msg
})
        `,
        JSON.stringify(contextInput)
      );

      const parsed = safeJsonParse<{ column_data: ColumnData; error_msg: string }>(result);

      if (parsed) {
        if (parsed.error_msg === "Success") {
          setCleanedColumnData({ columnData: parsed.column_data, jsonResult: parsed.error_msg });
        } else {
          // Only update jsonResult with error, keep previous columnData intact
          setCleanedColumnData(prev => prev ? { columnData: prev.columnData, jsonResult: parsed.error_msg } : { columnData: cleanedColumnData?.columnData!, jsonResult: parsed.error_msg });
        }
      } else {
        setCleanedColumnData(prev => prev ? { columnData: prev.columnData, jsonResult: "Error executing python code" } : { columnData: cleanedColumnData?.columnData!, jsonResult: "Error executing python code" });
      }

    })();
  }, [isReady, cleanedColumnData, cleaningCode, executeCleaning]);

  return {setCleaningCode, cleanedColumnData, setCleanedColumnData, setExecuteCleaning};
}
