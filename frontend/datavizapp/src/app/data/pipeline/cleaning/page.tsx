"use client";

import { AgGridReact } from "ag-grid-react";
import { usePyodide } from "@/app/hooks/usePyodide";
import { useEffect, useState } from "react";

type FileData = {
  id: string;
  accessToken: string;
};

export default function CleaningPage() {
  const [fileData, setFileData] = useState<FileData | undefined>(undefined);
  const [lastLoadedFileId, setLastLoadedFileId] = useState<string | null>(null);

  // Load file data from session storage
  useEffect(() => {
    const stored = sessionStorage.getItem("pageData");
    if (stored) setFileData(JSON.parse(stored));
  }, []);
  
  // Pyodide
  const { pyodide, isReady } = usePyodide();
  const [dataFrame, setDataFrame] = useState<Record<string, string>[]>([]);

  useEffect(() => {
    if (!isReady || !pyodide || !fileData) return;
    if (fileData.id === lastLoadedFileId) return;

    const fetchAndProcessFile = async () => {
      try {
        await pyodide.loadPackage("pandas");
        const url = `https://www.googleapis.com/drive/v3/files/${fileData.id}?alt=media`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${fileData.accessToken}` },
        });
        if (!response.ok) throw new Error(`Error fetching file: ${response.statusText}`);

        const fileContent = await response.text();
        pyodide.globals.set("file_content", fileContent);

        try {
          const jsonStr = await pyodide.runPythonAsync(`
            import pandas as pd
            import io
            df = pd.read_csv(io.StringIO(file_content))
            df.to_json(orient="records")
          `);
          setDataFrame(JSON.parse(jsonStr));
          setLastLoadedFileId(fileData.id);
        } catch (err) {
          console.error("Error processing file with Pyodide:", err);
        }
      } catch (err) {
        console.error("Error fetching file or loading pandas:", err);
      }
    };

    fetchAndProcessFile();
  }, [isReady, pyodide, fileData, lastLoadedFileId]);

  const columnDefs =
    dataFrame.length > 0
      ? Object.keys(dataFrame[0]).map((key) => ({ field: key, editable: true }))
      : [];

  return (
    <div className="ag-theme-alpine " style={{ height: "600px"}}>
      <AgGridReact rowData={dataFrame} columnDefs={columnDefs} singleClickEdit={true} />
    </div>

  );
}