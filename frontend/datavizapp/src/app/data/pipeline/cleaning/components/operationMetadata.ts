/**
 * Purpose: Centralise metadata for cleaning operations used by the toolbar and history.
 * Params: None.
 * Returns: Operation configuration helpers.
 * Steps: 1. Declare operation definitions. 2. Provide lookup utilities. 3. Export the metadata for UI usage.
 */
﻿import { CleaningOperation } from "./pythonTransforms";

/**
 * Purpose: Describe a cleaning operation configuration object.
 * Params: None.
 * Returns: Type used within the cleaning module.
 * Steps: 1. Capture the operation value. 2. Store human-readable labels. 3. Flag option requirements.
 */
export type OperationConfig = {
  value: CleaningOperation;
  label: string;
  helper?: string;
  requiresFillValue?: boolean;
  requiresSearchReplace?: boolean;
};

/**
 * Purpose: List all supported cleaning operations.
 * Params: None.
 * Returns: Array of operation configuration entries.
 * Steps: 1. Provide default label text. 2. Mark operations that need extra input. 3. Serve as the source for dropdown options.
 */
export const OPERATION_CONFIG: OperationConfig[] = [
  {
    value: "trim_whitespace",
    label: "Trim whitespace",
    helper: "Remove leading and trailing spaces",
  },
  {
    value: "fill_missing",
    label: "Fill missing",
    helper: "Replace blanks/nulls with a value",
    requiresFillValue: true,
  },
  {
    value: "drop_duplicates",
    label: "Drop duplicates",
    helper: "Keep the first occurrence of each unique value",
  },
  {
    value: "to_lower",
    label: "Lowercase",
    helper: "Convert all values to lowercase",
  },
  {
    value: "to_upper",
    label: "Uppercase",
    helper: "Convert all values to uppercase",
  },
  {
    value: "replace_value",
    label: "Find & replace",
    helper: "Replace a specific value",
    requiresSearchReplace: true,
  },
];

/**
 * Purpose: Find a configuration entry for a given operation.
 * Params: {operation} Cleaning operation identifier.
 * Returns: OperationConfig | undefined for the requested operation.
 * Steps: 1. Search the configuration list. 2. Compare by value. 3. Return the matching metadata when available.
 */
export const getOperationConfig = (operation: CleaningOperation) =>
  OPERATION_CONFIG.find((item) => item.value === operation);


