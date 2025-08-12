// components/CSVDataGrid.tsx
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

{/* Properties of CSVDataGrid
  columnDefs: ColDef[]
  Type: Array of AG Grid Column Definitions
  Usage: Defines how each column in the grid should be displayed and behave.

  rowData: Record<string, unknown>[]
  Type: Array of objects with string keys and unknown values
  Usage: Provides the data to be displayed in the grid, with each object representing a row.
 */}
interface CSVDataGridProps {
  columnDefs: ColDef[];
  rowData: Record<string, unknown>[];
}

export default function CSVDataGrid({ columnDefs, rowData }: CSVDataGridProps) {
  {/* component applies these default settings to all columns unless overridden */}
  const defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    editable: true,
    flex: 1
  };

  {/* display ag grid table */}
  return (
    <div className="ag-theme-alpine" style={{ height: '500px', width: '100%' }}>
      <AgGridReact
        columnDefs={columnDefs}
        rowData={rowData}
        defaultColDef={defaultColDef}
        pagination={true}
        paginationPageSize={20}
        suppressExcelExport={true}
      />
    </div>
  );
}