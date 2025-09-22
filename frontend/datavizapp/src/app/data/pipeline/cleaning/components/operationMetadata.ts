import { CleaningOperation } from "./pythonTransforms";

export type OperationConfig = {
  value: CleaningOperation;
  label: string;
  helper?: string;
  requiresFillValue?: boolean;
  requiresSearchReplace?: boolean;
};

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

export const getOperationConfig = (operation: CleaningOperation) =>
  OPERATION_CONFIG.find((item) => item.value === operation);


