"use client";

/**
 * Purpose: Render the editable grid that displays the cleaning dataset.
 * Params: None.
 * Returns: React component definition with typed props.
 * Steps: 1. Build column definitions. 2. Transform rows for ag-grid consumption. 3. Sync edits back through provided callbacks.
 */

import { useEffect, useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";

import type { DatasetMatrixColumn, DatasetMatrixRow } from "../types";

/**
 * Purpose: Describe the props consumed by the cleaning grid.
 * Params: None.
 * Returns: Type alias for component props.
 * Steps: 1. Carry dataset metadata and rows. 2. Identify the selected column. 3. Provide change handlers and optional loading state.
 */
export type CleaningGridProps = {
  columns: DatasetMatrixColumn[];
  rows: DatasetMatrixRow[];
  selectedColumnNumber: number | null;
  onCellValueChange: (recordNumber: number, columnNumber: number, value: string) => void;
  loading?: boolean;
};

export type CleaningRow = {
  recordNumber: number;
  value: string;
};

/**
 * Purpose: Display the cleaning dataset with scrollable editing.
 * Params: Destructured CleaningGridProps containing columns, rows, selection, handler, and loading state.
 * Returns: JSX.Element wrapping the ag-grid instance.
 * Steps: 1. Memoise column definitions and row data. 2. Keep the selected column in view. 3. Emit changes through onCellValueChange.
 */
export default function CleaningGrid({
  columns,
  rows,
  selectedColumnNumber,
  onCellValueChange,
  loading,
}: CleaningGridProps) {
  const gridRef = useRef<AgGridReact<Record<string, unknown>>>(null);

  const columnDefs = useMemo<ColDef[]>(() => {
    const baseColumn: ColDef = {
      headerName: "Row",
      field: "recordNumber",
      colId: "recordNumber",
      editable: false,
      width: 120,
      pinned: "left",
      suppressMovable: true,
    };

    const dynamicColumns: ColDef[] = columns.map((column) => {
      const colId = `col_${column.columnNumber}`;
      return {
        headerName: column.columnName || `Column ${column.columnNumber}`,
        field: colId,
        colId,
        editable: true,
        minWidth: 160,
        flex: 1,
        resizable: true,
        cellClass: (params) =>
          params.colDef.colId === `col_${selectedColumnNumber}`
            ? "bg-primary/10 font-medium"
            : undefined,
        headerClass: selectedColumnNumber === column.columnNumber ? "bg-primary/20" : undefined,
      } satisfies ColDef;
    });

    return [baseColumn, ...dynamicColumns];
  }, [columns, selectedColumnNumber]);

  const rowData = useMemo(() => {
    return rows.map((row) => {
      const record: Record<string, unknown> = {
        recordNumber: row.recordNumber,
      };

      columns.forEach((column, index) => {
        record[`col_${column.columnNumber}`] = row.values[index] ?? "";
      });

      return record;
    });
  }, [rows, columns]);

  useEffect(() => {
    if (selectedColumnNumber == null) return;
    const api = gridRef.current?.api;
    const columnId = `col_${selectedColumnNumber}`;
    api?.ensureColumnVisible(columnId);
    api?.refreshHeader();
    api?.refreshCells({ columns: [columnId], force: true });
  }, [selectedColumnNumber]);

  useEffect(() => {
    gridRef.current?.api?.sizeColumnsToFit();
  }, [columns, rowData.length]);

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-lg border border-base-300">
      <div className="ag-theme-alpine h-full w-full">
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          overlayLoadingTemplate={`<span class="ag-overlay-loading-center">Loading...</span>`}
          overlayNoRowsTemplate={`<span class="ag-overlay-loading-center">No data</span>`}
          suppressRowClickSelection
          animateRows
          stopEditingWhenCellsLoseFocus
          singleClickEdit
          onCellValueChanged={(event) => {
            const recordNumber = Number(event.data?.recordNumber ?? event.node?.data?.recordNumber ?? 0);
            const colId = event.column?.getColId() ?? event.colDef.colId;
            if (!colId || !colId.startsWith("col_")) {
              return;
            }
            const columnNumber = Number(colId.replace("col_", ""));
            const value = String(event.newValue ?? "");
            onCellValueChange(recordNumber, columnNumber, value);
          }}
        />
      </div>
      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-base-100/70">
          <span className="loading loading-spinner" />
        </div>
      )}
    </div>
  );
}
