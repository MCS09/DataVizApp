"use client";

import { AgGridReact } from "ag-grid-react";
import { useEffect, useState } from "react";
import { ColDef } from "ag-grid-community";
import { useLoadDataFrame, usePyFunctions } from "@/lib/hooks/cleaningHooks";


export default function CleaningPage() {
  const {dataFrame, setFileData} = useLoadDataFrame();
  const [columnDefs, setColumnDefs] = useState<ColDef[] | null>(null);

  // Load file data from session storage
  useEffect(() => {
    const stored = sessionStorage.getItem("pageData");
    if (stored) setFileData(JSON.parse(stored));
  });

  useEffect(() => {
    if (dataFrame == null) return;

    const columnDefs =
      dataFrame.length > 0
      ? Object.keys(dataFrame[0]).map((key) => ({ field: key, editable: true }))
      : [];

    setColumnDefs(columnDefs);

    
  }, [dataFrame])

  return (
    <div className="ag-theme-alpine " style={{ height: "600px"}}>
      <AgGridReact rowData={dataFrame} columnDefs={columnDefs} singleClickEdit={true} />
    </div>

  );
}