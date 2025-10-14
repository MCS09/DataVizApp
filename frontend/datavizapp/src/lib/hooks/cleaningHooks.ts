"use client";
/* eslint-disable  @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unused-vars */

import { useCallback, useEffect, useState } from "react";
import { usePyodide } from "./usePyodide";
import { FileData } from "../dataset";
import { safeJsonParse } from "../api";
import { ColumnProfile } from "@/app/components/input/Fieldset";

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

// Define a new type that can be either a Google Drive source or a local File
type FileDataSource = FileData | File;

export function useCleanColumnDataTester() {
  const [context, setContext] = useState<{columnData: ColumnData, jsonResult?: string} | undefined>();
  const {isReady, executeEmbeddedCode} = usePyFunctions();
  const [cleaningCode, setCleaningCode] = useState<string | null>(null);
  const [executeCleaning, setExecuteCleaning] = useState<{toExecute: boolean, params?: Record<string, any>}>({toExecute: false});

  useEffect(() => {
    if (!isReady || !context || !cleaningCode || !executeCleaning.toExecute) return;
    setExecuteCleaning({ toExecute: false });

    (async () => {
      const pyInput = {
        column_data: context.columnData,
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
        JSON.stringify(pyInput)
      );

      const parsed = safeJsonParse<{ column_data: ColumnData; error_msg: string }>(result);

      if (!parsed) {
        setContext({...context, jsonResult: "Python function with undetected error" });
      }
      else{
        if (parsed.error_msg === "Success") {
            setContext({ columnData: parsed.column_data, jsonResult: parsed.error_msg });
        } else {
          // Only update jsonResult with error, keep previous columnData intact
          setContext({ columnData: context.columnData, jsonResult: parsed.error_msg });
        }
      }

    })();
  }, [isReady, context, cleaningCode, executeCleaning]);

  return {setCleaningCode, context, setContext, setExecuteCleaning};
}
