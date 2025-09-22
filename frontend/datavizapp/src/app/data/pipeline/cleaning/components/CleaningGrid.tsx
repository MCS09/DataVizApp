"use client";

import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";

export type CleaningRow = {
  recordNumber: number;
  value: string;
};

type CleaningGridProps = {
  columnName?: string;
  rows: CleaningRow[];
  onValueChange: (recordNumber: number, value: string) => void;
  loading?: boolean;
};

export default function CleaningGrid({
  columnName,
  rows,
  onValueChange,
  loading,
}: CleaningGridProps) {
  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "Row",
        field: "recordNumber",
        editable: false,
        width: 120,
        pinned: "left",
      },
      {
        headerName: columnName || "Value",
        field: "value",
        editable: true,
        flex: 1,
      },
    ],
    [columnName]
  );

  return (
    <div className="relative ag-theme-alpine h-[500px] w-full">
      <AgGridReact
        rowData={rows}
        columnDefs={columnDefs}
        overlayLoadingTemplate={`<span class="ag-overlay-loading-center">Loading...</span>`}
        overlayNoRowsTemplate={`<span class="ag-overlay-loading-center">No data</span>`}
        isRowSelectable={() => false}
        onCellValueChanged={(event) => {
          const recordNumber = event.data.recordNumber as number;
          const value = String(event.newValue ?? "");
          onValueChange(recordNumber, value);
        }}
        suppressRowClickSelection={true}
        animateRows={true}
        suppressMovableColumns={true}
        singleClickEdit={true}
        stopEditingWhenCellsLoseFocus={true}
        // immutableData={true}
        getRowId={(params) => params.data.recordNumber.toString()}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-base-100/80">
          <span className="loading loading-spinner" />
        </div>
      )}
    </div>
  );
}



