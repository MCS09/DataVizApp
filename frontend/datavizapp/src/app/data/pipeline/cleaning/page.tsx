"use client";

import { AgGridReact } from "ag-grid-react";
import { useEffect, useState } from "react";
import { ColDef } from "ag-grid-community";
import { usePyFunctions } from "@/lib/hooks/cleaningHooks";
import useStore from "@/lib/store";
import { useColumnData } from "@/lib/hooks/useColumnData";


export default function CleaningPage() {
  const {columnData, datasetId, setColumnData, setColumnNumber, setDatasetId} = useColumnData();
  const [columnDefs, setColumnDefs] = useState<ColDef[] | null>(null);
  const {sharedState, updateState} = useStore();

  // Load file data from session storage
  useEffect(() => {
    const stored = sessionStorage.getItem("sessionFileData");
    if (stored) {
      const parsed = JSON.parse(stored);
      setDatasetId(parsed.datasetId);
    }
  }, []);

  

  useEffect(() => {
    if (!datasetId || !columnData){
      return;
    }
    setColumnNumber()
  }, [datasetId, columnData])

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