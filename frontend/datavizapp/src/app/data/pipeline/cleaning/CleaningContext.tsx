"use client";

/**
 * Purpose: Manage shared state and business logic for the cleaning workflow, including data loading, transformations, and persistence.
 * Params: None.
 * Returns: Exports the CleaningProvider and related hooks/utilities.
 * Steps: 1. Load dataset matrices and column metadata. 2. Expose handlers for grid interactions and transformations. 3. Persist changes and synchronise shared aiContext.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import useStore from "@/lib/store";
import { safeJsonParse } from "@/lib/api";
import { usePyFunctions, ColumnData } from "@/lib/hooks/cleaningHooks";
import {
  loadCleaningTransformCode,
  CleaningOperation,
  CleaningOptions,
} from "./components/pythonTransforms";
import { getOperationConfig } from "./components/operationMetadata";
import type { ColumnProfile } from "@/app/data/pipeline/profiling/components/CarouselItem";
import type { CleaningRow } from "./components/CleaningGrid";
import type { TransformationHistoryItem } from "./components/TransformationHistory";
import { getDatasetMatrix, setDatasetMatrix } from "./api";
import type { DatasetMatrixColumn, DatasetMatrixRow } from "./types";

const mapRecordsToRows = (records: ColumnData["dataRecords"]): CleaningRow[] =>
  records
    .map((record) => ({
      recordNumber: record.recordNumber,
      value: record.value ?? "",
    }))
    .sort((a, b) => a.recordNumber - b.recordNumber);

const rowsToColumnRecords = (rows: CleaningRow[]): ColumnData["dataRecords"] =>
  rows.map((row) => ({
    recordNumber: row.recordNumber,
    value: row.value ?? "",
  }));

const cloneMatrixRows = (rows: DatasetMatrixRow[]): DatasetMatrixRow[] =>
  rows.map((row) => ({
    recordNumber: row.recordNumber,
    values: row.values.slice(),
  }));

type HistoryRecord = TransformationHistoryItem & {
  snapshot: CleaningRow[];
  operation: CleaningOperation;
  options?: CleaningOptions;
};

type CleaningContextValue = {
  datasetId: number | null;
  setDatasetId: (datasetId: number | null) => void;
  columnNumber: number | null;
  setColumnNumber: (columnNumber: number | null) => void;
  columnProfiles: ColumnProfile[];
  columnsLoading: boolean;
  columnsError: string | null;
  columnName: string;
  columnData: ColumnData | null;
  matrixColumns: DatasetMatrixColumn[];
  matrixRows: DatasetMatrixRow[];
  matrixLoading: boolean;
  matrixError: string | null;
  rows: CleaningRow[];
  baselineRows: CleaningRow[];
  history: HistoryRecord[];
  dirty: boolean;
  isSaving: boolean;
  localError: string | null;
  pyLoading: boolean;
  pyError: Error | null;
  isReady: boolean;
  isBusy: boolean;
  handleColumnChange: (columnNumber: number) => void;
  handleCellChange: (recordNumber: number, columnNumber: number, value: string) => void;
  handleApplyTransformation: (operation: CleaningOperation, options?: CleaningOptions) => Promise<void>;
  handleUndo: (id: string) => void;
  handleReset: () => void;
  handleSave: () => Promise<void>;
  setLocalError: (value: string | null) => void;
};

const CleaningContext = createContext<CleaningContextValue | undefined>(undefined);

/**
 * Purpose: Supply cleaning state and handlers to all children.
 * Params: {children} React subtree consuming the context.
 * Returns: JSX.Element wrapping the provided children.
 * Steps: 1. Initialise shared state and hooks. 2. Load dataset information and keep local caches. 3. Expose handlers for grid interactions and persistence.
 */
export function CleaningProvider({ children }: { children: ReactNode }) {
  const { updateState } = useStore();
  const { executeEmbeddedCode, loading: pyLoading, error: pyError, isReady } = usePyFunctions();

  const [datasetId, setDatasetId] = useState<number | null>(null);
  const [columnNumber, setColumnNumber] = useState<number | null>(null);

  const [columnProfiles, setColumnProfiles] = useState<ColumnProfile[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [columnsError, setColumnsError] = useState<string | null>(null);

  const [matrixColumns, setMatrixColumns] = useState<DatasetMatrixColumn[]>([]);
  const [matrixRows, setMatrixRows] = useState<DatasetMatrixRow[]>([]);
  const [baselineMatrixRows, setBaselineMatrixRows] = useState<DatasetMatrixRow[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixError, setMatrixError] = useState<string | null>(null);

  const [columnData, setColumnData] = useState<ColumnData | null>(null);
  const [rows, setRows] = useState<CleaningRow[]>([]);
  const [baselineRows, setBaselineRows] = useState<CleaningRow[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [columnName, setColumnName] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [pendingAiContext, setPendingAiContext] = useState<string | null>(null);
  const lastAiContextRef = useRef<string | null>(null);

  /**
 * Purpose: Queue an aiContext update while avoiding redundant writes.
 * Params: {value} Pending JSON string to store.
 * Returns: void.
 * Steps: 1. Compare the candidate value with the last broadcast. 2. Skip if unchanged. 3. Otherwise store it for the flush effect.
 */
const scheduleAiContextUpdate = useCallback((value: string) => {
    if (lastAiContextRef.current === value) {
      return;
    }
    setPendingAiContext(value);
  }, []);



  const skipSyncRef = useRef(false);

  useEffect(() => {
    if (pendingAiContext == null) {
      return;
    }

    updateState({ aiContext: pendingAiContext });
    setPendingAiContext(null);
  }, [pendingAiContext, updateState]);

  // Load dataset context from session storage on first render
  useEffect(() => {
    const stored = sessionStorage.getItem("sessionFileData");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.datasetId != null) {
        const nextDatasetId = Number(parsed.datasetId);
        if (!Number.isNaN(nextDatasetId)) {
          setDatasetId(nextDatasetId);
          setColumnNumber(0);
        }
      }
    } catch (error) {
      console.warn("Failed to parse sessionFileData", error);
    }
  }, []);

  // Fetch dataset matrix when datasetId changes
  useEffect(() => {
    if (datasetId == null) {
      setMatrixColumns([]);
      setMatrixRows([]);
      setBaselineMatrixRows([]);
      setColumnProfiles([]);
      setColumnNumber(null);
      setMatrixError(null);
      setColumnsError(null);
      return;
    }

    let isCancelled = false;

    const loadMatrix = async () => {
      try {
        setMatrixLoading(true);
        setColumnsLoading(true);
        setMatrixError(null);
        setColumnsError(null);

        const matrix = await getDatasetMatrix(datasetId);
        if (isCancelled) return;

        setMatrixColumns(matrix.headers);
        if (matrix.headers.length === 0) {
          setMatrixRows([]);
          setBaselineMatrixRows([]);
          setColumnProfiles([]);
          setColumnNumber(null);
          return;
        }
        setMatrixRows(matrix.rows);
        setBaselineMatrixRows(cloneMatrixRows(matrix.rows));

        const profiles: ColumnProfile[] = matrix.headers.map((header) => ({
          columnNumber: header.columnNumber,
          columnName: header.columnName ?? `Column ${header.columnNumber}`,
          columnDescription: header.columnDescription ?? "",
          dataType: header.dataType ?? "string",
          relationship: header.relationship ?? "",
        }));
        setColumnProfiles(profiles);

        if (columnNumber == null || !matrix.headers.some((header) => header.columnNumber === columnNumber)) {
          const firstColumnNumber = matrix.headers[0]?.columnNumber;
          if (firstColumnNumber != null) {
            setColumnNumber(firstColumnNumber);
          }
        }
      } catch (error) {
        if (isCancelled) return;
        console.error("Failed to load dataset matrix", error);
        const message = error instanceof Error ? error.message : "Failed to load dataset matrix";
        setMatrixError(message);
        setColumnsError(message);
        setMatrixColumns([]);
        setMatrixRows([]);
        setBaselineMatrixRows([]);
        setColumnProfiles([]);
      } finally {
        if (!isCancelled) {
          setMatrixLoading(false);
          setColumnsLoading(false);
        }
      }
    };

    loadMatrix();

    return () => {
      isCancelled = true;
    };
  }, [datasetId]);

  // Derive single-column state from matrix when column selection or matrix changes
  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }

    if (datasetId == null || columnNumber == null) {
      setColumnData(null);
      setRows([]);
      setBaselineRows([]);
      setColumnName("");
      setHistory([]);
      setDirty(false);
      return;
    }

    const columnIndex = matrixColumns.findIndex((header) => header.columnNumber === columnNumber);
    if (columnIndex === -1) {
      return;
    }

    const dataRecords = matrixRows.map((row) => ({
      recordNumber: row.recordNumber,
      value: row.values[columnIndex] ?? "",
    }));

    const nextColumnData: ColumnData = {
      datasetId: datasetId.toString(),
      columnNumber,
      dataRecords,
    };

    const nextRows = mapRecordsToRows(nextColumnData.dataRecords);

    setColumnData(nextColumnData);
    setRows(nextRows);
    setBaselineRows(nextRows.map((row) => ({ ...row })));
    setHistory([]);
    setDirty(false);
    setLocalError(null);

    const header = matrixColumns[columnIndex];
    const displayName =
      header.columnName || header.columnDescription || `Column ${header.columnNumber}`;
    setColumnName(displayName);

    scheduleAiContextUpdate(JSON.stringify(nextColumnData));
  }, [matrixRows, matrixColumns, columnNumber, datasetId, scheduleAiContextUpdate]);

/**
   * Purpose: Change the focused column when the user selects a new one.
   * Params: {nextColumnNumber} Column index chosen by the user.
   * Returns: void.
   * Steps: 1. Ignore repeated selections. 2. Clear transient errors and history. 3. Update the active column number.
   */
  const handleColumnChange = useCallback(
    (nextColumnNumber: number) => {
      if (columnNumber === nextColumnNumber) return;
      setLocalError(null);
      setHistory([]);
      setRows([]);
      setBaselineRows([]);
      setDirty(false);
      setColumnNumber(nextColumnNumber);
    },
    [columnNumber]
  );

/**
   * Purpose: Apply a transformation callback to the stored matrix for a specific column.
   * Params: {targetColumnNumber} Column to mutate, {updater} function receiving a row snapshot.
   * Returns: void.
   * Steps: 1. Locate the column index. 2. Map each row through the updater. 3. Write back new values only when changes occur.
   */
  const updateMatrixForColumn = useCallback(
    (targetColumnNumber: number, updater: (row: CleaningRow) => CleaningRow) => {
      const columnIndex = matrixColumns.findIndex((header) => header.columnNumber === targetColumnNumber);
      if (columnIndex === -1) return;

      setMatrixRows((prev) =>
        prev.map((row) => {
          const updatedRow = updater({ recordNumber: row.recordNumber, value: row.values[columnIndex] ?? "" });
          if (updatedRow.value === row.values[columnIndex]) {
            return row;
          }
          const values = row.values.slice();
          values[columnIndex] = updatedRow.value ?? "";
          return { ...row, values };
        })
      );
    },
    [matrixColumns]
  );

/**
   * Purpose: Update both matrix and row state when a single grid cell changes.
   * Params: {recordNumber} Row identifier, {targetColumnNumber} column being edited, {value} new cell value.
   * Returns: void.
   * Steps: 1. Persist the change to the matrix model. 2. Mirror updates in the active column view. 3. Flag the dataset as dirty for saving.
   */
  const handleCellChange = useCallback(
    (recordNumber: number, targetColumnNumber: number, value: string) => {
      skipSyncRef.current = true;
      const nextValue = value ?? "";

      updateMatrixForColumn(targetColumnNumber, (row) => {
        if (row.recordNumber !== recordNumber) return row;
        return { ...row, value: nextValue };
      });

      if (columnNumber === targetColumnNumber) {
        setRows((prev) =>
          prev.map((row) =>
            row.recordNumber === recordNumber ? { ...row, value: nextValue } : row
          )
        );

        setColumnData((prev) => {
          if (!prev) return prev;
          const nextRecords = prev.dataRecords.map((record) =>
            record.recordNumber === recordNumber ? { ...record, value: nextValue } : record
          );
          const updated: ColumnData = {
            ...prev,
            dataRecords: nextRecords,
          };
          scheduleAiContextUpdate(JSON.stringify(updated));
          return updated;
        });
      }

      setDirty(true);
    },
    [columnNumber, updateMatrixForColumn, scheduleAiContextUpdate]
  );

/**
   * Purpose: Execute a Python-powered transformation against the focused column.
   * Params: {operation} Cleaning operation identifier, {options} optional parameters for the operation.
   * Returns: Promise<void> resolving when processing completes.
   * Steps: 1. Build the payload for Pyodide. 2. Run the embedded Python code and parse results. 3. Update rows, matrix, history, and dirty state.
   */
  const handleApplyTransformation = useCallback(
    async (operation: CleaningOperation, options?: CleaningOptions) => {
      if (!columnData) return;
      if (!isReady) {
        setLocalError("Cleaning engine is still loading. Please try again in a moment.");
        return;
      }

      try {
        setLocalError(null);
        const payload = {
          dataRecords: rowsToColumnRecords(rows),
          operation,
          options,
        };
        const rawCode = await loadCleaningTransformCode();
        const response = await executeEmbeddedCode(rawCode, JSON.stringify(payload));
        const parsed = safeJsonParse<{ dataRecords: ColumnData["dataRecords"] }>(response);

        if (!parsed?.dataRecords) {
          throw new Error("Unable to parse transformation response");
        }

        const nextRows = mapRecordsToRows(parsed.dataRecords);
        const operationMeta = getOperationConfig(operation);
        const labelParts = [operationMeta?.label ?? operation];

        if (operation === "fill_missing" && options?.fillValue) {
          labelParts.push(`-> "${options.fillValue}"`);
        }
        if (operation === "replace_value" && options?.search != null) {
          labelParts.push(`(${options.search} -> ${options.replace ?? ""})`);
        }

        const snapshot = rows.map((row) => ({ ...row }));
        setHistory((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${prev.length}`,
            label: labelParts.join(" "),
            timestamp: Date.now(),
            snapshot,
            operation,
            options,
          },
        ]);

        skipSyncRef.current = true;
        setRows(nextRows);
        setColumnData((prev) => {
          if (!prev) return prev;
          const updated: ColumnData = {
            ...prev,
            dataRecords: rowsToColumnRecords(nextRows),
          };
          scheduleAiContextUpdate(JSON.stringify(updated));
          return updated;
        });

        if (columnNumber != null) {
          updateMatrixForColumn(columnNumber, (row) => {
            const match = nextRows.find((candidate) => candidate.recordNumber === row.recordNumber);
            return match ?? row;
          });
        }

        setDirty(true);
      } catch (error) {
        console.error("Failed to apply transformation", error);
        setLocalError(
          error instanceof Error ? error.message : "Failed to apply transformation"
        );
      }
    },
    [columnData, isReady, rows, executeEmbeddedCode, columnNumber, updateMatrixForColumn, scheduleAiContextUpdate]
  );

/**
   * Purpose: Restore the dataset to a previous snapshot from history.
   * Params: {id} Identifier of the history entry to revert to.
   * Returns: void.
   * Steps: 1. Find the requested history item. 2. Reapply its stored snapshot to rows and matrix. 3. Trim history entries beyond the restored point.
   */
  const handleUndo = useCallback(
    (id: string) => {
      setHistory((prev) => {
        const index = prev.findIndex((entry) => entry.id === id);
        if (index === -1) return prev;

        const target = prev[index];
        const restored = target.snapshot.map((row) => ({ ...row }));
        skipSyncRef.current = true;
        setRows(restored);
        setDirty(true);
        setColumnData((prevColumn) => {
          if (!prevColumn) return prevColumn;
          const updated: ColumnData = {
            ...prevColumn,
            dataRecords: rowsToColumnRecords(restored),
          };
          scheduleAiContextUpdate(JSON.stringify(updated));
          return updated;
        });

        if (columnNumber != null) {
          updateMatrixForColumn(columnNumber, (row) => {
            const match = restored.find((candidate) => candidate.recordNumber === row.recordNumber);
            return match ?? row;
          });
        }

        return prev.slice(0, index);
      });
    },
    [columnNumber, updateMatrixForColumn, scheduleAiContextUpdate]
  );

/**
   * Purpose: Revert the dataset to the last saved baseline.
   * Params: None.
   * Returns: void.
   * Steps: 1. Clone baseline rows and matrix. 2. Reset dirty state and history. 3. Synchronise the column data snapshot.
   */
  const handleReset = useCallback(() => {
    const restoredMatrix = cloneMatrixRows(baselineMatrixRows);
    skipSyncRef.current = true;
    setMatrixRows(restoredMatrix);
    setRows(baselineRows.map((row) => ({ ...row })));
    setDirty(false);
    setHistory([]);
    setColumnData((prev) => {
      if (!prev) return prev;
      const updated: ColumnData = {
        ...prev,
        dataRecords: rowsToColumnRecords(baselineRows),
      };
      scheduleAiContextUpdate(JSON.stringify(updated));
      return updated;
    });
  }, [baselineMatrixRows, baselineRows, scheduleAiContextUpdate]);

/**
   * Purpose: Persist the full table back to the backend service.
   * Params: None.
   * Returns: Promise<void> resolving when the API calls finish.
   * Steps: 1. Build the dataset payload. 2. POST each column via setDatasetMatrix. 3. Refresh baselines and clear dirty markers on success.
   */
  const handleSave = useCallback(async () => {
    if (datasetId == null) return;

    try {
      setIsSaving(true);
      setLocalError(null);

      const payload = {
        datasetId,
        headers: matrixColumns,
        rows: matrixRows,
      };

      const success = await setDatasetMatrix(payload);
      if (!success) {
        throw new Error("Failed to persist dataset");
      }

      setBaselineMatrixRows(cloneMatrixRows(matrixRows));
      setBaselineRows(rows.map((row) => ({ ...row })));
      setHistory([]);
      setDirty(false);

      if (columnData) {
        scheduleAiContextUpdate(JSON.stringify(columnData));
      }
    } catch (error) {
      console.error("Failed to save dataset", error);
      setLocalError(error instanceof Error ? error.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [datasetId, matrixColumns, matrixRows, rows, columnData, scheduleAiContextUpdate]);

  const isBusy = pyLoading || isSaving || matrixLoading;

  const contextValue = useMemo<CleaningContextValue>(
    () => ({
      datasetId,
      setDatasetId,
      columnNumber,
      setColumnNumber,
      columnProfiles,
      columnsLoading,
      columnsError,
      columnName,
      columnData,
      matrixColumns,
      matrixRows,
      matrixLoading,
      matrixError,
      rows,
      baselineRows,
      history,
      dirty,
      isSaving,
      localError,
      pyLoading,
      pyError,
      isReady,
      isBusy,
      handleColumnChange,
      handleCellChange,
      handleApplyTransformation,
      handleUndo,
      handleReset,
      handleSave,
      setLocalError,
    }),
    [
      datasetId,
      columnNumber,
      columnProfiles,
      columnsLoading,
      columnsError,
      columnName,
      columnData,
      matrixColumns,
      matrixRows,
      matrixLoading,
      matrixError,
      rows,
      baselineRows,
      history,
      dirty,
      isSaving,
      localError,
      pyLoading,
      pyError,
      isReady,
      isBusy,
      handleColumnChange,
      handleCellChange,
      handleApplyTransformation,
      handleUndo,
      handleReset,
      handleSave,
    ]
  );

  return <CleaningContext.Provider value={contextValue}>{children}</CleaningContext.Provider>;
}

/**
 * Purpose: Access the cleaning context within descendants.
 * Params: None.
 * Returns: CleaningContextValue containing state and handlers.
 * Steps: 1. Read context via useContext. 2. Throw if no provider is present. 3. Return the strongly typed value.
 */
export function useCleaningContext(): CleaningContextValue {
  const context = useContext(CleaningContext);
  if (!context) {
    throw new Error("useCleaningContext must be used within a CleaningProvider");
  }
  return context;
}














