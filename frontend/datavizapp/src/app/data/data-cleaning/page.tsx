"use client";

import { AgGridReact } from "ag-grid-react";
import { usePyodide } from "@/app/hooks/usePyodide";
import { useEffect, useState } from "react";
import { useDataContext } from "../DataContext";

export default function CleaningPage() {
  const { fileId, accessToken } = useDataContext();
  const { pyodide, isReady } = usePyodide();
  const [dataFrame, setDataFrame] = useState<Record<string, string>[]>([]);

  useEffect(() => {
    if (!isReady || !pyodide || !fileId || !accessToken) return;

    const fetchAndProcessFile = async () => {
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error(`Error fetching file: ${response.statusText}`);

      const fileContent = await response.text();
      pyodide.globals.set("file_content", fileContent);

      const jsonStr = await pyodide.runPythonAsync(`
        import pandas as pd
        import io
        df = pd.read_csv(io.StringIO(file_content))
        df.to_json(orient="records")
      `);
      setDataFrame(JSON.parse(jsonStr));
    };

    fetchAndProcessFile();
  }, [isReady, pyodide, fileId, accessToken]);

  const columnDefs =
    dataFrame.length > 0
      ? Object.keys(dataFrame[0]).map((key) => ({ field: key, editable: true }))
      : [];

  return (
    <div className="ag-theme-alpine" style={{ height: 400, width: 600 }}>
      <AgGridReact rowData={dataFrame} columnDefs={columnDefs} singleClickEdit={true} />
    </div>
  );
}