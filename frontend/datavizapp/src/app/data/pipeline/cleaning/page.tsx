"use client";

/**
 * Purpose: Provide the main cleaning interface route that hosts the grid, toolbar, and history in a single view.
 * Params: None.
 * Returns: JSX markup driven by the cleaning context provider.
 * Steps: 1. Wrap the view with CleaningProvider. 2. Render the cleaning UI through CleaningView. 3. Export the route component for Next.js routing.
 */

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/input/Button";
import useStore from "@/lib/store";

import CleaningGrid from "./components/CleaningGrid";
import CleaningToolbar from "./components/CleaningToolbar";
import TransformationHistory from "./components/TransformationHistory";
import type { TransformationHistoryItem } from "./components/TransformationHistory";
import { CleaningProvider, useCleaningContext } from "./CleaningContext";

/**
 * Purpose: Render the interactive cleaning workspace that coordinates column selection and transformation controls.
 * Params: None.
 * Returns: JSX.Element containing the cleaning UI.
 * Steps: 1. Read shared state from the cleaning context. 2. Provide fallbacks when data is unavailable. 3. Render the grid, toolbar, and history components.
 */
function CleaningView() {
  const router = useRouter();
  const {
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
    history,
    dirty,
    isSaving,
    localError,
    pyLoading,
    pyError,
    isBusy,
    cellRisks,
    riskSummary,
    clearCellRisks,
    scanStatus,
    handleColumnChange,
    handleCellChange,
    handleApplyTransformation,
    handleReset,
    handleSave,
    handleUndo,
  } = useCleaningContext();
  const { updateState } = useStore();

  const historyItems = useMemo<TransformationHistoryItem[]>(
    () => history.map(({ id, label, timestamp }) => ({ id, label, timestamp })),
    [history]
  );
  const riskTotal = riskSummary.high + riskSummary.medium + riskSummary.low;
  const hasRiskHighlights = Object.keys(cellRisks).length > 0;
  const showDetectionScreen = scanStatus === 'running' && !hasRiskHighlights;
  const handleRetryScan = useCallback(() => {
    if (scanStatus === 'failed') {
      updateState({ cleaningScanStatus: 'idle' });
    }
  }, [scanStatus, updateState]);


  if (datasetId == null) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-base-content/70">
          Select or import a dataset to begin cleaning.
        </p>
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

  if (showDetectionScreen) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <span className="loading loading-spinner loading-lg" />
        <div className="max-w-md text-base-content/70">
          Running automated data-quality scan for this dataset. Hang tight while we identify risky cells.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold" htmlFor="column-select">
          Column
        </label>
        <select
          id="column-select"
          className="select select-bordered select-sm"
          value={columnNumber ?? ""}
          onChange={(event) => handleColumnChange(Number(event.target.value))}
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
        {columnsLoading && <span className="loading loading-spinner loading-xs" />}
        <Button
          action={() => router.push("/data/pipeline/visualization")}
          label="Generate visualization"
        />
      </div>

      {columnsError && <p className="text-sm text-error">{columnsError}</p>}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{columnName}</h2>
        {dirty && <span className="badge badge-warning">Unsaved changes</span>}
      </div>

      {(localError || pyError) && (
        <div className="alert alert-error text-sm">
          {localError || pyError?.message}
        </div>
      )}

      {scanStatus === 'failed' && !hasRiskHighlights && (
        <div className="alert alert-warning flex items-center justify-between gap-4 text-sm">
          <span>Automatic risk detection could not complete. You can still inspect the column manually or ask the assistant for help.</span>
          <button type="button" className="btn btn-xs btn-outline" onClick={handleRetryScan}>Retry scan</button>
        </div>
      )}

      {riskTotal > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-base-200/70 p-3 text-sm">
          <span className="font-semibold">AI risk flags</span>
          {riskSummary.high > 0 && (
            <span className="badge badge-error badge-outline">{riskSummary.high} high</span>
          )}
          {riskSummary.medium > 0 && (
            <span className="badge badge-warning badge-outline">{riskSummary.medium} medium</span>
          )}
          <button
            type="button"
            className="btn btn-xs btn-ghost"
            onClick={clearCellRisks}
          >
            Clear highlights
          </button>
        </div>
      )}

      <CleaningGrid
        columns={matrixColumns}
        rows={matrixRows}
        selectedColumnNumber={columnNumber}
        onCellValueChange={handleCellChange}
        loading={matrixLoading || pyLoading}
        cellRisks={cellRisks}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CleaningToolbar
            disabled={isBusy}
            onApply={handleApplyTransformation}
            onReset={handleReset}
            onSave={handleSave}
            isSaving={isSaving}
            dirty={dirty}
          />
        </div>
        <div className="lg:col-span-1">
          <TransformationHistory items={historyItems} onUndo={handleUndo} />
        </div>
      </div>
    </div>
  );
}

/**
 * Purpose: Register the cleaning route component with the provider applied.
 * Params: None.
 * Returns: JSX.Element wrapping the cleaning view with context state.
 * Steps: 1. Instantiate the CleaningProvider. 2. Render the CleaningView as the route body. 3. Export the component for routing.
 */
export default function CleaningPage() {
  return (
    <CleaningProvider>
      <CleaningView />
    </CleaningProvider>
  );
}
