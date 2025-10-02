/**
 * Purpose: Define shared TypeScript types for the cleaning matrix.
 * Params: None.
 * Returns: Type aliases exported for use in hooks and components.
 * Steps: 1. Describe column metadata. 2. Model row values. 3. Combine structures into a dataset matrix contract.
 */
/**
 * Purpose: Describe metadata for a single column in the cleaning matrix.
 * Params: None.
 * Returns: Type alias used across the cleaning module.
 * Steps: 1. Capture column numbering. 2. Provide naming details. 3. Retain optional relationship metadata.
 */
export type DatasetMatrixColumn = {
  columnNumber: number;
  columnName: string;
  columnDescription: string;
  dataType: string;
  relationship?: string | null;
};

/**
 * Purpose: Represent a single record spanning all columns.
 * Params: None.
 * Returns: Type alias capturing record values.
 * Steps: 1. Track the row identifier. 2. Store the ordered list of column values. 3. Ensure string coercion downstream.
 */
export type DatasetMatrixRow = {
  recordNumber: number;
  values: string[];
};

/**
 * Purpose: Aggregate headers and rows for the entire dataset.
 * Params: None.
 * Returns: Type alias used when exchanging matrices with helper APIs.
 * Steps: 1. Include the dataset identifier. 2. Attach ordered column headers. 3. Bundle the row collection.
 */
export type DatasetMatrix = {
  datasetId: number;
  headers: DatasetMatrixColumn[];
  rows: DatasetMatrixRow[];
};
