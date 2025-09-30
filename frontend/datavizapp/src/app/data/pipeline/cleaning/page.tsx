"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePyFunctions } from "@/lib/hooks/cleaningHooks";
import useStore from "@/lib/store";
import { useColumnData } from "@/lib/hooks/useColumnData";
import { fetchData, postData, safeJsonParse } from "@/lib/api";
import CleaningToolbar from "./components/CleaningToolbar";
import CleaningGrid, { CleaningRow } from "./components/CleaningGrid";
import TransformationHistory, {
  TransformationHistoryItem,
} from "./components/TransformationHistory";
import {
  loadCleaningTransformCode,
  CleaningOperation,
  CleaningOptions,
} from "./components/pythonTransforms";
import { getOperationConfig } from "./components/operationMetadata";
import { Column } from "@/lib/hooks/useColumns";
import { ColumnProfile } from "@/app/data/pipeline/profiling/components/CarouselItem";
import { ColumnData } from "@/lib/hooks/cleaningHooks";

import { useRouter } from "next/navigation";
import Button from "../../../components/input/Button"

type HistoryRecord = TransformationHistoryItem & {
  snapshot: CleaningRow[];
  operation: CleaningOperation;
  options?: CleaningOptions;
};

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

export default function CleaningPage() {
  const router = useRouter();
  const {
    columnData,
    datasetId,
    columnNumber,
    setColumnData,
    setColumnNumber,
    setDatasetId,
  } = useColumnData();
  const { sharedState, updateState } = useStore();
  const { executeEmbeddedCode, loading: pyLoading, error: pyError, isReady } =
    usePyFunctions();

  const [rows, setRows] = useState<CleaningRow[]>([]);
  const [baselineRows, setBaselineRows] = useState<CleaningRow[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [columnName, setColumnName] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [columnProfiles, setColumnProfiles] = useState<ColumnProfile[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [columnsError, setColumnsError] = useState<string | null>(null);
  const skipSyncRef = useRef(false);


  // Load dataset context from session storage
  useEffect(() => {
    const stored = sessionStorage.getItem("sessionFileData");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.datasetId != null) {
        setDatasetId(parsed.datasetId);
        setColumnNumber(0);
      }
    } catch (error) {
      console.warn("Failed to parse sessionFileData", error);
    }
  }, [setDatasetId, setColumnNumber]);

  useEffect(() => {
    if (!datasetId) {
      setColumnProfiles([]);
      setColumnsError(null);
      setColumnsLoading(false);
      return;
    }

    let isCancelled = false;

    const loadColumnProfiles = async () => {
      try {
        setColumnsLoading(true);
        setColumnsError(null);
        const response = await fetchData<ColumnProfile[]>(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getColumnsByDatasetId/${datasetId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!isCancelled) {
          const sorted = response.slice().sort(
            (a, b) => a.columnNumber - b.columnNumber
          );
          setColumnProfiles(sorted);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to load column definitions", error);
          setColumnProfiles([]);
          setColumnsError(
            error instanceof Error ? error.message : "Failed to load columns"
          );
        }
      } finally {
        if (!isCancelled) {
          setColumnsLoading(false);
        }
      }
    };

    loadColumnProfiles();

    return () => {
      isCancelled = true;
    };
  }, [datasetId]);

  useEffect(() => {
    if (columnProfiles.length === 0) return;
    if (
      columnNumber == null ||
      !columnProfiles.some((profile) => profile.columnNumber === columnNumber)
    ) {
      setColumnNumber(columnProfiles[0].columnNumber);
    }
  }, [columnProfiles, columnNumber, setColumnNumber]);
  // Resolve column display name from the profiling context if available
  useEffect(() => {
    if (!columnData) {
      setColumnName("");
      return;
    }

    let displayName = `Column ${columnData.columnNumber}`;

    const profile = columnProfiles.find(
      (current) => current.columnNumber === columnData.columnNumber
    );

    if (profile) {
      displayName =
        profile.columnName || profile.columnDescription || displayName;
    } else if (sharedState.aiContext) {
      const parsed = safeJsonParse<unknown>(sharedState.aiContext);

      if (Array.isArray(parsed)) {
        const matching = parsed.find(
          (column: Column) =>
            column.columnProfile.columnNumber === columnData.columnNumber
        );
        if (matching) {
          displayName =
            matching.columnHeader || matching.columnProfile.columnName;
        }
      }
    }

    setColumnName(displayName);
  }, [columnData, sharedState.aiContext, columnProfiles]);

  // Sync rows whenever the backend column data changes
  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }

    if (!columnData) {
      setRows([]);
      setBaselineRows([]);
      setHistory([]);
      setDirty(false);
      return;
    }

    const nextRows = mapRecordsToRows(columnData.dataRecords);
    setRows(nextRows);
    setBaselineRows(nextRows.map((row) => ({ ...row })));
    setHistory([]);
    setDirty(false);
    setLocalError(null);

    updateState({ aiContext: JSON.stringify(columnData) });
  }, [columnData, updateState]);

  const isBusy = pyLoading || isSaving || columnsLoading;

  const handleColumnChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextColumnNumber = Number(event.target.value);
    if (Number.isNaN(nextColumnNumber) || nextColumnNumber === columnNumber) {
      return;
    }
    setLocalError(null);
    setHistory([]);
    setRows([]);
    setBaselineRows([]);
    setDirty(false);
    setColumnNumber(nextColumnNumber);
  };
  const handleValueChange = (recordNumber: number, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.recordNumber === recordNumber ? { ...row, value } : row
      )
    );
    setDirty(true);

    skipSyncRef.current = true;
    let updatedColumn: ColumnData | undefined;

    setColumnData((prev) => {
      if (!prev) return prev;
      const nextRecords = prev.dataRecords.map((record) =>
        record.recordNumber === recordNumber ? { ...record, value } : record
      );
      const updated = { ...prev, dataRecords: nextRecords };
      updatedColumn = updated;
      return updated;
    });

    if (updatedColumn) {
      updateState({ aiContext: JSON.stringify(updatedColumn) });
    }
  };

  const handleApplyTransformation = async (
    operation: CleaningOperation,
    options?: CleaningOptions
  ) => {
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
      const response = await executeEmbeddedCode(
        rawCode,
        JSON.stringify(payload)
      );
      const parsed = safeJsonParse<{
        dataRecords: ColumnData["dataRecords"];
      }>(response);

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

      setRows(nextRows);
      setDirty(true);
      skipSyncRef.current = true;
      let updatedColumn: ColumnData | undefined;

      setColumnData((prev) => {
        if (!prev) return prev;
        const updated: ColumnData = {
          ...prev,
          dataRecords: rowsToColumnRecords(nextRows),
        };
        updatedColumn = updated;
        return updated;
      });

      if (updatedColumn) {
        updateState({ aiContext: JSON.stringify(updatedColumn) });
      }
    } catch (error) {
      console.error("Failed to apply transformation", error);
      setLocalError(
        error instanceof Error
          ? error.message
          : "Failed to apply transformation"
      );
    }
  };

  const handleUndo = (id: string) => {
    setHistory((prev) => {
      const index = prev.findIndex((entry) => entry.id === id);
      if (index === -1) return prev;

      const target = prev[index];
      const restored = target.snapshot.map((row) => ({ ...row }));
      setRows(restored);
      setDirty(true);
      skipSyncRef.current = true;
      let updatedColumn: ColumnData | undefined;

      setColumnData((prevColumn) => {
        if (!prevColumn) return prevColumn;
        const updated: ColumnData = {
          ...prevColumn,
          dataRecords: rowsToColumnRecords(restored),
        };
        updatedColumn = updated;
        return updated;
      });

      if (updatedColumn) {
        updateState({ aiContext: JSON.stringify(updatedColumn) });
      }

      return prev.slice(0, index);
    });
  };

  const handleReset = () => {
    const restored = baselineRows.map((row) => ({ ...row }));
    setRows(restored);
    setDirty(false);
    setHistory([]);
    skipSyncRef.current = true;
    let updatedColumn: ColumnData | undefined;

    setColumnData((prev) => {
      if (!prev) return prev;
      const updated: ColumnData = {
        ...prev,
        dataRecords: rowsToColumnRecords(restored),
      };
      updatedColumn = updated;
      return updated;
    });

    if (updatedColumn) {
      updateState({ aiContext: JSON.stringify(updatedColumn) });
    }
  };

  const handleSave = async () => {
    if (!columnData) return;

    try {
      setIsSaving(true);
      setLocalError(null);

      const payload: ColumnData = {
        ...columnData,
        dataRecords: rowsToColumnRecords(rows),
      };

      const success = await postData(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/setColumnData`,
        payload
      );

      if (!success) {
        throw new Error("Failed to persist column data");
      }

      setBaselineRows(rows.map((row) => ({ ...row })));
      setHistory([]);
      setDirty(false);
      skipSyncRef.current = true;
      setColumnData(payload);
      updateState({ aiContext: JSON.stringify(payload) });
    } catch (error) {
      console.error("Failed to save column", error);
      setLocalError(
        error instanceof Error ? error.message : "Failed to save changes"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const historyItems = useMemo<TransformationHistoryItem[]>(
    () => history.map(({ id, label, timestamp }) => ({ id, label, timestamp })),
    [history]
  );

  if (!datasetId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-base-content/70">Select or import a dataset to begin cleaning.</p>
      </div>
    );
  }

  if (!columnData) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-base-content/70">Loading column data...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full gap-6">
      <div className="flex w-3/5 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold" htmlFor="column-select">
            Column
          </label>
          <select
            id="column-select"
            className="select select-bordered select-sm"
            value={columnNumber ?? ""}
            onChange={handleColumnChange}
            disabled={columnsLoading || columnProfiles.length === 0}
          >
            {columnNumber == null && (
              <option value="" disabled>
                Select a column
              </option>
            )}
            {columnProfiles.map((profile) => (
              <option key={profile.columnNumber} value={profile.columnNumber}>
                {profile.columnName || `Column ${profile.columnNumber}`}
              </option>
            ))}
          </select>
          {columnsLoading && (
            <span className="loading loading-spinner loading-xs" />
          )}
          <Button action={() => router.push("/data/pipeline/visualization")} label="Generate visualization"/>
        </div>
        {columnsError && (
          <p className="text-sm text-error">{columnsError}</p>
        )}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{columnName}</h2>
          {dirty && (
            <span className="badge badge-warning">Unsaved changes</span>
          )}
        </div>

        {(localError || pyError) && (
          <div className="alert alert-error text-sm">
            {localError || pyError?.message}
          </div>
        )}

        <CleaningGrid
          columnName={columnName}
          rows={rows}
          onValueChange={handleValueChange}
          loading={isBusy}
        />
      </div>

      <div className="flex w-2/5 flex-col gap-4">
        <CleaningToolbar
          disabled={isBusy}
          onApply={handleApplyTransformation}
          onReset={handleReset}
          onSave={handleSave}
          isSaving={isSaving}
          dirty={dirty}
        />
        <TransformationHistory items={historyItems} onUndo={handleUndo} />
      </div>
    </div>
  );
}