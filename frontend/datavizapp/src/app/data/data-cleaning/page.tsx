// 'use client';

// import React, { useState } from 'react';
// import { AgGridReact } from 'ag-grid-react';
// import { ColDef } from 'ag-grid-community';
// import 'ag-grid-community/styles/ag-grid.css';
// import 'ag-grid-community/styles/ag-theme-alpine.css';
// import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'; 

// // Register all Community features
// ModuleRegistry.registerModules([AllCommunityModule]);

// type RowDataType = {
//   name: string;
//   age: number;
//   country: string;
// };

// const initialColumnDefs: ColDef<RowDataType>[] = [
//   {
//     field: 'name',
//     headerName: 'Name',
//     editable: true,
//     valueParser: (params) => String(params.newValue),
//   },
//   {
//     field: 'age',
//     headerName: 'Age',
//     editable: true,
//     valueParser: (params) => Number(params.newValue),
//   },
//   {
//     field: 'country',
//     headerName: 'Country',
//     editable: true,
//     cellEditor: 'agSelectCellEditor',
//     cellEditorParams: {
//     values: ['USA', 'UK', 'Canada'],
//     },
//   },
// ];

// const initialRowData: RowDataType[] = [
//   { name: 'alice', age: 25, country: 'USA' },
//   { name: 'bob', age: 30, country: 'UK' },
//   { name: 'charlie', age: 28, country: 'Canada' },
// ];


// export default async function datasetCleaningPage() {
//   const [columnDefs, setColumnDefs] = useState(initialColumnDefs);
//   const [rowData, setRowData] = useState(initialRowData);


//   return (
//     <div className="ag-theme-alpine" style={{ height: 300, width: 600 }}>
//       <AgGridReact<RowDataType>
//         rowData={rowData}
//         columnDefs={columnDefs}
//         defaultColDef={{
//           sortable: true,
//           filter: true,
//           flex: 1,
//         }}
//         onCellValueChanged={(event) => {
//           console.log('Row updated:', event.data);
//         }}
//       />
//     </div>
//   );
// };

'use client';
import React, { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

import type { ColDef, ColGroupDef, ValueGetterParams } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";

ModuleRegistry.registerModules([AllCommunityModule]);

const CustomButtonComponent = () => {
  return <button onClick={() => console.log("clicked")}>Push Me!</button>;
};

export default async function GridExample() {
  const [rowData, setRowData] = useState<any[]>([
    { make: "Tesla", model: "Model Y", price: 64950, electric: true },
    { make: "Ford", model: "F-Series", price: 33850, electric: false },
    { make: "Toyota", model: "Corolla", price: 29600, electric: false },
    { make: "Mercedes", model: "EQA", price: 48890, electric: true },
    { make: "Fiat", model: "500", price: 15774, electric: false },
    { make: "Nissan", model: "Juke", price: 20675, electric: false },
  ]);
  const [columnDefs, setColumnDefs] = useState<
    (ColDef<any, any> | ColGroupDef<any>)[]
  >([
    {
      headerName: "Make & Model",
      valueGetter: (p: ValueGetterParams) => p.data.make + " " + p.data.model,
      flex: 2,
    },
    {
      field: "price",
      valueFormatter: (p) => "£" + Math.floor(p.value).toLocaleString(),
      flex: 1,
    },
    { field: "electric", flex: 1 },
    { field: "button", cellRenderer: CustomButtonComponent, flex: 1 },
  ]);
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div style={{ width: "100%", height: "100%" }}>
        <AgGridReact rowData={rowData} columnDefs={columnDefs} />
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <GridExample />
  </StrictMode>,
);