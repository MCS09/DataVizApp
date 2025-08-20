import { useCallback, useEffect, useState } from "react";
import { usePyodide } from "./usePyodide";
import { FileData } from "../dataset";

type DataFrame = DataCell[];
type DataCell = {
  recordNumber: number,
  columnNumber: number,
  data: string
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

export function useLoadDataFrame() {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [dataFrame, setDataFrame] = useState<DataFrame | null>(null);

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
          df = pd.read_csv(embedded_input)
          # Ensure recordNumber column is created from the index
          df = df.reset_index().rename(columns={df.index.name or "index": "recordNumber"})

          # Melt into cell-oriented format
          cell_df = df.melt(id_vars=["recordNumber"], var_name="columnNumber", value_name="data")

          # Optional: turn columnNumber into numeric indices (0..N-1)
          col_map = {name: i for i, name in enumerate(df.columns) if name != "recordNumber"}
          cell_df["columnNumber"] = cell_df["columnNumber"].map(col_map)

          # Convert to JSON array of cells
          output_json = cell_df.to_json(orient="records")
          `,
          fileContent
        );

        setDataFrame(JSON.parse(result));
        sessionStorage.setItem("fileCred", JSON.stringify(fileData));
      } catch (err) {
        console.error("Failed to load dataframe:", err);
      }
    };

    load();
  }, [isReady, fileData, executeEmbeddedCode]);

  return { dataFrame, fileData, loading, error, setFileData };
}