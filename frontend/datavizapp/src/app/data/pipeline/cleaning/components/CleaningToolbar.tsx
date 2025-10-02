/** header missing */
﻿"use client";

import { useMemo, useState } from "react";
import Button from "@/app/components/input/Button";
import {
  CleaningOperation,
  CleaningOptions,
} from "./pythonTransforms";
import {
  OPERATION_CONFIG,
  getOperationConfig,
} from "./operationMetadata";

/**
 * Purpose: Define the props accepted by the cleaning toolbar.
 * Params: None.
 * Returns: Type shape listing callbacks and state flags.
 * Steps: 1. Describe disabling conditions. 2. Provide apply/reset/save handlers. 3. Indicate persistence and dirty state.
 */
type CleaningToolbarProps = {
  disabled?: boolean;
  onApply: (operation: CleaningOperation, options?: CleaningOptions) => void;
  onReset: () => void;
  onSave: () => void;
  isSaving?: boolean;
  dirty?: boolean;
};

/**
 * Purpose: Render toolbar controls for column cleaning operations.
 * Params: Destructured CleaningToolbarProps with callbacks and flags.
 * Returns: JSX.Element containing inputs and buttons.
 * Steps: 1. Track local inputs for operations. 2. Guard button availability. 3. Invoke callbacks when actions are triggered.
 */
export default function CleaningToolbar({
  disabled,
  onApply,
  onReset,
  onSave,
  isSaving,
  dirty,
}: CleaningToolbarProps) {
  const [selectedOperation, setSelectedOperation] = useState<CleaningOperation>(
    "trim_whitespace"
  );
  const [fillValue, setFillValue] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [replaceValue, setReplaceValue] = useState("");

  const activeOperation = useMemo(
    () => getOperationConfig(selectedOperation),
    [selectedOperation]
  );

  const canApply = useMemo(() => {
    if (!activeOperation) return false;
    if (activeOperation.requiresFillValue) {
      return fillValue.trim().length > 0;
    }
    if (activeOperation.requiresSearchReplace) {
      return searchValue.length > 0;
    }
    return true;
  }, [activeOperation, fillValue, searchValue]);

  const handleApply = () => {
    if (!activeOperation) return;
    const options: CleaningOptions = {};

    if (activeOperation.requiresFillValue) {
      options.fillValue = fillValue;
    }

    if (activeOperation.requiresSearchReplace) {
      options.search = searchValue;
      options.replace = replaceValue;
    }

    onApply(selectedOperation, options);
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-base-300 bg-base-100 p-4">
      <div className="flex flex-col gap-2">
        <label className="font-semibold">Transformation</label>
        <select
          className="select select-bordered"
          value={selectedOperation}
          onChange={(event) =>
            setSelectedOperation(event.target.value as CleaningOperation)
          }
          disabled={disabled}
        >
          {OPERATION_CONFIG.map((operation) => (
            <option key={operation.value} value={operation.value}>
              {operation.label}
            </option>
          ))}
        </select>
        {activeOperation?.helper && (
          <p className="text-xs text-base-content/70">{activeOperation.helper}</p>
        )}
      </div>

      {activeOperation?.requiresFillValue && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Fill value</label>
          <input
            type="text"
            className="input input-bordered"
            value={fillValue}
            onChange={(event) => setFillValue(event.target.value)}
            placeholder="e.g. Unknown"
            disabled={disabled}
          />
        </div>
      )}

      {activeOperation?.requiresSearchReplace && (
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium">Search & replace</label>
          <input
            type="text"
            className="input input-bordered"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search for"
            disabled={disabled}
          />
          <input
            type="text"
            className="input input-bordered"
            value={replaceValue}
            onChange={(event) => setReplaceValue(event.target.value)}
            placeholder="Replace with"
            disabled={disabled}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          label="Apply"
          className="btn btn-primary"
          action={handleApply}
          disabled={disabled || !canApply}
        />
        <Button
          label="Reset"
          className="btn btn-ghost"
          action={onReset}
          disabled={disabled}
        />
        <Button
          label={isSaving ? "Saving..." : dirty ? "Save changes" : "Save"}
          className="btn btn-secondary"
          action={onSave}
          disabled={disabled || isSaving || !dirty}
        />
      </div>
    </div>
  );
}

